const _imageToData = (imageUrl) => {
  try {
    const needsAuth =
      /googleusercontent\.com|docs\.google\.com|drive\.google\.com/i.test(
        imageUrl,
      );
    const opts = { muteHttpExceptions: true, followRedirects: true };
    if (needsAuth)
      opts.headers = { Authorization: "Bearer " + ScriptApp.getOAuthToken() };
    const res = UrlFetchApp.fetch(imageUrl, opts);
    if (res.getResponseCode() >= 200 && res.getResponseCode() < 300) {
      const b = res.getBlob();
      const mime = b.getContentType() || "image/png";
      const bytes = b.getBytes();
      return { mime, bytes };
    }
  } catch (_) {}
  return null;
};

const _replaceImageURLs = (html, slug) => {
  const parsed = HTMLParser.parse(html);
  const images = parsed.querySelectorAll("img");
  const pushData = [];
  images.forEach((img, idx) => {
    const src = img.getAttribute("src");
    if (src && /^https?:\/\//i.test(src)) {
      const data = _imageToData(src);
      if (data && data.bytes && data.mime) {
        const ext = data.mime.split("/")[1] || "png";
        const path = `/images/${slug}-${idx}.${ext}`;
        img.setAttribute("src", path);
        pushData.push({ path, ...data });
        console.log(`Inlined image ${idx + 1} for ${slug}`);
      } else {
        console.warn(`Failed to fetch image ${idx + 1} for ${slug}: ${src}`);
      }
    }
  });
  return { html: parsed.toString(), images: pushData };
};

const _netlifyApi = (method, path, payloadObj, extra) => {
  const props = PropertiesService.getScriptProperties();
  const token = props.getProperty("NETLIFY_TOKEN");
  if (!token) throw new Error("Missing NETLIFY_TOKEN");

  const url = "https://api.netlify.com" + path;
  const params = {
    method: method || "get",
    muteHttpExceptions: true,
    headers: { Authorization: "Bearer " + token, Accept: "application/json" },
  };
  if (payloadObj !== undefined) {
    params.contentType = "application/json";
    params.payload = JSON.stringify(payloadObj);
  }
  if (extra) Object.assign(params, extra);

  const res = UrlFetchApp.fetch(url, params);
  const code = res.getResponseCode();
  const text = res.getContentText();
  if (code < 200 || code >= 300) {
    throw new Error(`Netlify API ${code} for ${url}: ${text.slice(0, 400)}`);
  }
  return text ? JSON.parse(text) : null;
};

const _buildSiteFiles = () => {
  const docId = _getDocId();
  const parsed = HTMLParser.parse(_fetchDocHtml(docId));
  const titles = _extractAllH1Titles(parsed);
  const webAppTitle = _getWebAppTitle(docId);

  const files = [];
  console.log(`Building site with ${titles.length} editions`);

  const footer = _extractWrappedFooter(parsed);
  const { html: footerHtml, images: footerImages } = _replaceImageURLs(
    footer,
    "footer",
  );
  files.push(...footerImages);

  // Per-edition pages
  titles.forEach((title) => {
    const section = _extractEditionSection(parsed, title, true);
    if (!section) return;
    const extraStyle = _extractPageStyle(parsed);
    const slug = _slugify(title);
    const { html: sectionHtml, images: sectionImages } = _replaceImageURLs(
      section,
      slug,
    );
    files.push(...sectionImages);
    const page = _buildWebHtml(
      webAppTitle,
      title,
      extraStyle,
      sectionHtml,
      footerHtml,
    );

    const mime = "text/html";
    const bytes = Utilities.newBlob(page, mime).getBytes();
    files.push({
      path: `/article/${slug}.html`,
      bytes,
      mime,
    });
  });

  // Subscribe page
  const allow_subscriptions = _getProperty("WEBAPP_ALLOW_SUBSCRIBE") === "true";
  if (allow_subscriptions) {
    const execUrl = _getWebAppExecUrl();
    const subscribeHtml = _subscribeFormHtml(execUrl);
    const subscribePage = _buildWebHtml(
      webAppTitle,
      `Subscribe`,
      "",
      subscribeHtml,
      footerHtml,
    );
    files.push({
      path: "/subscribe.html",
      bytes: Utilities.newBlob(subscribePage, "text/html").getBytes(),
      mime: "text/html",
    });
  }

  // Archive page
  // NOTE: Assuming no images in index/archive
  const baseUrl = _getProperty("NETLIFY_URL") || "";
  const execUrl = _getWebAppExecUrl();
  const archive = _buildIndexHtml(
    parsed,
    webAppTitle,
    baseUrl,
    execUrl,
    allow_subscriptions,
    null,
  );
  const page = _buildWebHtml(webAppTitle, webAppTitle, "", archive, footerHtml);

  files.push({
    path: "/index.html",
    bytes: Utilities.newBlob(page, "text/html").getBytes(),
    mime: "text/html",
  });

  return files;
};

const deployToNetlify = () => {
  const props = PropertiesService.getScriptProperties();
  const siteId = props.getProperty("NETLIFY_SITE_ID");
  if (!siteId) throw new Error("Missing NETLIFY_SITE_ID");

  // 1) Build full site files (so old links remain valid)
  const files = _buildSiteFiles();

  // 2) Compute manifest: path -> sha1
  const manifest = {};
  files.forEach((f) => (manifest[`/${f.path}`] = _sha1Hex(f.bytes)));

  // 3) Create a deploy with the digest
  // Returns deploy info; Netlify will request missing files.
  const deploy = _netlifyApi(
    "post",
    `/api/v1/sites/${encodeURIComponent(siteId)}/deploys`,
    {
      files: manifest,
      title: `Deployed from Inkling on ${new Date().toISOString()}`,
    },
  );

  const deployId = deploy.id;
  // In some responses you’ll also see "required": ["<sha1>", ...] listing
  // blobs not yet on Netlify. But the canonical flow is: for each file,
  // attempt PUT; Netlify stores only the ones it needs.

  // 4) Upload files (raw content) to /deploys/:id/files/:path
  // Filter required files, if deploy.required is present.
  const required = deploy.required || [];
  const requiredFiles = files.filter(
    (f) => required.indexOf(manifest[`/${f.path}`]) !== -1,
  );

  requiredFiles.forEach((f) => {
    const path = encodeURI(f.path);
    const res = _netlifyApi(
      "put",
      `/api/v1/deploys/${encodeURIComponent(deployId)}/files${path}`,
      undefined,
      { contentType: f.mime || "application/octet-stream", payload: f.bytes },
    );
    // No error means OK; Netlify ignores re-uploads of known blobs.
    console.log(`Uploaded ${f.path} (${f.bytes.length} bytes)`);
  });

  // 5) (Optional) Poll deploy until state === 'ready' (usually fast)
  const ready = _netlifyApi(
    "get",
    `/api/v1/deploys/${encodeURIComponent(deployId)}`,
  );
  const url = (ready.ssl_url || ready.url || "").replace(/\/$/, "");
  _setMsg(`Deployed to ${url}`);
  return { url, deploy: ready };
};

const openNetlifySite = () => {
  const props = PropertiesService.getScriptProperties();
  const url = props.getProperty("NETLIFY_URL");
  if (!url) {
    SpreadsheetApp.getUi().alert("Missing NETLIFY_URL");
    return;
  }
  const html = `<p>Open your Netlify site:</p>
    <p><a href="${url}" target="_blank" rel="noopener">${url}</a></p>`;
  SpreadsheetApp.getUi().showModalDialog(
    HtmlService.createHtmlOutput(html).setWidth(400).setHeight(150),
    "Netlify Site",
  );
};
