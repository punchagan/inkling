const _inlineImagesAsDataUris = (html) => {
  return html.replace(/<img\b[^>]*src=["']([^"']+)["'][^>]*>/gi, (m, src) => {
    try {
      const needsAuth =
        /googleusercontent\.com|docs\.google\.com|drive\.google\.com/i.test(
          src,
        );
      const opts = { muteHttpExceptions: true, followRedirects: true };
      if (needsAuth)
        opts.headers = { Authorization: "Bearer " + ScriptApp.getOAuthToken() };
      const res = UrlFetchApp.fetch(src, opts);
      if (res.getResponseCode() >= 200 && res.getResponseCode() < 300) {
        const b = res.getBlob();
        const mime = b.getContentType() || "image/png";
        const b64 = Utilities.base64Encode(b.getBytes());
        return m.replace(src, `data:${mime};base64,${b64}`);
      }
    } catch (_) {}
    return m;
  });
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
  const raw = _fetchDocHtml(docId);
  const footerHtml = _extractWrappedFooter(raw);
  const titles = _extractAllH1Titles(raw);
  const webAppTitle = Drive.Files.get(docId).name || "Newsletter";

  const files = [];

  // Per-edition pages
  titles.forEach((title) => {
    const section = _extractEditionSection(raw, title);
    if (!section) return;
    const page = _inlineImagesAsDataUris(
      _buildWebHtml(title, section, footerHtml),
    );
    const slug = _slugify(title);
    const bytes = Utilities.newBlob(page, "text/html").getBytes();
    files.push({
      path: `article/${slug}.html`,
      bytes,
      mime: "text/html",
    });
  });

  // Archive page
  const archive = _buildIndexHtml(raw, webAppTitle, null, true);
  const page = _inlineImagesAsDataUris(
    _buildWebHtml(webAppTitle, archive, footerHtml),
  );
  files.push({
    path: "index.html",
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
    const path = encodeURI(`/${f.path}`);
    const res = _netlifyApi(
      "put",
      `/api/v1/deploys/${encodeURIComponent(deployId)}/files${path}`,
      undefined,
      { contentType: f.mime || "application/octet-stream", payload: f.bytes },
    );
    // No error means OK; Netlify ignores re-uploads of known blobs.
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
