const CONFIG = {
  SHEET: {
    SUBJECT_CELL: "D2", // email subject; must match the edition's H1
    MSG_CELL: "D4", // status messages from the script
    STATUS_COL: "C", // per-row status writeback
    CONTACTS_RANGE_START: "A2", // A: Name, B: Email
  },
  SHOW_VIEW_IN_BROWSER_BANNER: true,
  RATE_LIMIT_MS: 1200,
};

const _errStyle = SpreadsheetApp.newTextStyle()
  .setFontSize(9)
  .setBold(true)
  .setForegroundColor("red")
  .build();

const _okStyle = SpreadsheetApp.newTextStyle()
  .setFontSize(9)
  .setBold(true)
  .setForegroundColor("green")
  .build();

const _sheet = () => SpreadsheetApp.getActiveSheet();

const _setMsg = (msg, ok = true, cell = CONFIG.SHEET.MSG_CELL) =>
  _sheet()
    .getRange(cell)
    .setValue(msg)
    .setTextStyle(ok ? _okStyle : _errStyle);

const _getSubject = () =>
  _sheet().getRange(CONFIG.SHEET.SUBJECT_CELL).getValue();

const _isValidEmail = (e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(e || ""));

const _stripHtml = (s) => String(s).replace(/<[^>]+>/g, " ");

const _escapeHtml = (s) =>
  String(s).replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
  );

const _sanitizeName = (n) => String(n || "").trim() || "there";

const _getWebAppExecUrl = () => {
  const props = PropertiesService.getScriptProperties();
  const override = props.getProperty("WEBAPP_BASE_URL"); // preferred
  if (override) return String(override).replace(/\/dev$/, "/exec");
  try {
    const url = ScriptApp.getService().getUrl(); // fallback
    return url ? url.replace(/\/dev$/, "/exec") : "";
  } catch (_) {
    return "";
  }
};

const _openWebViewDialog = () => {
  const url = _getWebAppExecUrl();
  if (!url)
    return _setMsg(
      "Deploy the Web App first (Deploy → New deployment).",
      false,
    );
  // Open URL in a dialog (cannot open new tab directly from Apps Script)
  // Show clickable link
  const html = `Open the <a href=${url} target="_blank">web view</a> in a new tab`;
  SpreadsheetApp.getUi().showModalDialog(
    HtmlService.createHtmlOutput(html),
    "Open Web View",
  );
};

const _openSourceDocDialog = () => {
  const docId = _getDocId();
  if (!docId) {
    SpreadsheetApp.getUi().alert("No DOC_ID found in Script Properties.");
    return;
  }
  const url = `https://docs.google.com/document/d/${docId}/edit`;
  const html = `<a href="${url}" target="_blank">Open the Source Document</a>`;
  SpreadsheetApp.getUi().showModalDialog(
    HtmlService.createHtmlOutput(html),
    "Open the Source Document",
  );
};

const _getContacts = () => {
  const sh = _sheet();
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return [];
  const rng = sh
    .getRange(`${CONFIG.SHEET.CONTACTS_RANGE_START}:B${lastRow}`)
    .getValues();
  return rng
    .map(([name, email], i) => [
      String(name || "").trim(),
      String(email || "").trim(),
      i + 2,
    ])
    .filter(([n, e]) => n && e);
};

const _fetchDocHtml = (docId) => {
  // 1) Make sure Advanced Drive Service is enabled (Services → + → Drive API)
  // 2) Ensure the target is a Google Doc, not a folder/PDF/Word/etc.
  var fileMeta;
  try {
    fileMeta = Drive.Files.get(docId); // Advanced Drive (v2) metadata
  } catch (e) {
    throw new Error(
      "Drive.Files.get failed. Is the Drive Advanced Service enabled and DOC_ID correct?",
    );
  }

  if (fileMeta.mimeType !== "application/vnd.google-apps.document") {
    throw new Error(
      `DOC_ID must be a Google Doc. Found ${fileMeta.mimeType}. Open the Doc and copy the ID from its URL.`,
    );
  }

  // Try Advanced Service export first
  try {
    var resp = Drive.Files.export(docId, "text/html"); // HTTPResponse
    return resp.getBlob().getDataAsString("UTF-8");
  } catch (e) {
    // Fallback: explicit REST call with alt=media
    var url =
      "https://www.googleapis.com/drive/v3/files/" +
      encodeURIComponent(docId) +
      "/export?mimeType=text/html&alt=media";
    var params = {
      headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken() },
      muteHttpExceptions: true,
      followRedirects: true,
    };
    var resp2 = UrlFetchApp.fetch(url, params);
    var code = resp2.getResponseCode();
    if (code >= 200 && code < 300) {
      return resp2.getContentText("UTF-8");
    }
    throw new Error(
      `Drive export failed ${code}: ${resp2.getContentText().slice(0, 200)}`,
    );
  }
};

const _extractEditionSection = (rawHtml, subject) => {
  const norm = (s) => String(s).replace(/\s+/g, " ").trim();

  // Split into chunks beginning at <h1 ...>
  const parts = rawHtml.split(/(?=<h1\b[^>]*>)/i);
  if (parts.length === 1) {
    // No H1s
    return;
  }

  for (let i = 1; i < parts.length; i++) {
    const section = parts[i]; // starts with <h1...>
    const m = section.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
    if (!m) continue;
    const headingText = norm(m[1].replace(/<[^>]+>/g, ""));
    if (norm(headingText) === norm(subject)) {
      return section;
    }
  }
};

const _getDocId = () => {
  const props = PropertiesService.getScriptProperties();
  return props.getProperty("DOC_ID");
};

const _neutralizeInlineFonts = (html) => {
  // Remove font-size / font-family from any style="..."
  html = html.replace(/style="([^"]*)"/gi, (m, styles) => {
    const cleaned = styles
      .replace(/(?:^|;)\s*font-size\s*:[^;"]*/gi, "")
      .replace(/(?:^|;)\s*font-family\s*:[^;"]*/gi, "")
      .replace(/^\s*;|\s*;$/g, "");
    return cleaned ? `style="${cleaned}"` : ""; // drop empty style=""
  });

  // (Optional) strip any <style> blocks that define class-based fonts
  html = html.replace(/<style[\s\S]*?<\/style>/gi, "");

  return html;
};

const _prepareInlineImages = (html) => {
  const inlineImages = {};
  let idx = 0;

  // Inline images with OAuth for Drive/Docs URLs when needed
  html = html.replace(
    /<img\b[^>]*src=["']([^"']+)["'][^>]*>/gi,
    (match, src) => {
      try {
        const needsAuth =
          /googleusercontent\.com|docs\.google\.com|drive\.google\.com/i.test(
            src,
          );
        const params = {
          muteHttpExceptions: true,
          followRedirects: true,
        };
        if (needsAuth) {
          params.headers = {
            Authorization: "Bearer " + ScriptApp.getOAuthToken(),
          };
        }
        const res = UrlFetchApp.fetch(src, params);
        if (res.getResponseCode() >= 200 && res.getResponseCode() < 300) {
          const blob = res.getBlob();
          const cid = `img${idx++}`;
          inlineImages[cid] = blob;
          return match.replace(src, `cid:${cid}`);
        }
      } catch (e) {
        // If fetch fails, keep original src so it will still work in web view
      }
      return match;
    },
  );
  return { html, inlineImages };
};

const _prepareEmailBodyOnce = (editionHtml, footerHtml) => {
  let fullHtml = `${editionHtml}\n${footerHtml}`;
  let { html, inlineImages } = _prepareInlineImages(fullHtml);
  // Remove scripts for email safety
  html = html.replace(/<script[\s\S]*?<\/script>/gi, "");
  return { bodyHtml: html, inlineImages };
};

const _composeEmailHtml = (name, bodyHtml, browserUrl) => {
  const safeName = _escapeHtml(_sanitizeName(name));

  const greeting = `<div style="font:16px/1.5 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial;margin:20px 0;">
       Hi ${safeName},
     </div>`;

  const banner =
    CONFIG.SHOW_VIEW_IN_BROWSER_BANNER && browserUrl
      ? `<div style="font:12px/1.4 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial;color:#555;background:#fafafa;padding:10px 12px;border-bottom:1px solid #eee;">
           Trouble viewing? <a href="${browserUrl}" target="_blank" rel="noopener">View in browser</a>
         </div>`
      : "";

  return `<!doctype html>
<html>
  <head><meta charset="utf-8"></head>
  <body>
    ${banner}
    ${greeting}
    ${bodyHtml}
  </body>
</html>`;
};

const _extractWrappedFooter = (rawHtml) => {
  // footer is a <h2>Footer</h2> before the first <h1/>. If none, empty.
  const parts = rawHtml.split(/(?=<h1\b[^>]*>)/i);
  if (parts.length === 0) return "";
  const beforeFirstH1 = parts[0];
  const partsH2 = beforeFirstH1.split(/(?=<h2\b[^>]*>)/i);
  if (partsH2.length === 0) return "";
  // Look for a <h2>Footer</h2>
  for (let i = 1; i < partsH2.length; i++) {
    const section = partsH2[i]; // starts with <h2...>
    const m = section.match(/<h2\b[^>]*>([\s\S]*?)<\/h2>/i);
    if (m) {
      const inner = m[1] || "";
      const text = inner
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
      if (text === "footer") {
        // Strip off the <h2>Footer</h2> itself and return the rest
        const footer = _neutralizeInlineFonts(
          section.replace(/<h2\b[^>]*>[\s\S]*?<\/h2>/i, "").trim(),
        );
        return `<div style="font:12px/1.4 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial;padding:10px 12px;border-top:1px solid #eee;margin-top:24px;">
                   ${footer}
                </div>`;
      }
    }
  }
  return "";
};

const _sendEmailsFromDoc = (contacts, test = true) => {
  const subject = _getSubject();
  if (!subject)
    return _setMsg(`Enter a subject in ${CONFIG.SHEET.SUBJECT_CELL}`, false);

  const webAppBaseUrl = _getWebAppExecUrl();
  const webAppUrl = webAppBaseUrl
    ? `${webAppBaseUrl}?subject=${encodeURIComponent(subject)}`
    : "";
  _setMsg("Fetching document…");
  const rawDocHtml = _fetchDocHtml(_getDocId());
  const editionHtml = _extractEditionSection(rawDocHtml, subject);
  if (!editionHtml)
    return _setMsg(
      `Could not find any Heading 1 with the text: ${subject}`,
      false,
    );

  // 1) Prepare body ONCE (inline images etc.)
  const footerHtml = _extractWrappedFooter(rawDocHtml);
  const { bodyHtml, inlineImages } = _prepareEmailBodyOnce(
    editionHtml,
    footerHtml,
  );

  const emailSubject = test ? `[TEST] ${subject}` : subject;
  _setMsg(`Sending “${emailSubject}” to ${contacts.length}…`);

  const sh = _sheet();
  const statusCol = CONFIG.SHEET.STATUS_COL;
  let sent = 0,
    failed = 0;

  for (let i = 0; i < contacts.length; i++) {
    const [name, email, row] = contacts[i];
    const statusCell = `${statusCol}${row}`;

    if (!_isValidEmail(email)) {
      _setMsg("Invalid email", false, statusCell);
      failed++;
      continue;
    }

    // 2) Compose per-recipient FINAL HTML (adds greeting/banner/footer)
    const personalizedHtml = _composeEmailHtml(name, bodyHtml, webAppUrl);

    try {
      GmailApp.sendEmail(
        email,
        emailSubject,
        _stripHtml(personalizedHtml), // plain-text fallback
        { htmlBody: personalizedHtml, inlineImages },
      );
      _setMsg(`Sent ${new Date().toLocaleString()}`, true, statusCell);
      sent++;
    } catch (e) {
      _setMsg(`Error: ${e.message || e}`, false, statusCell);
      failed++;
    }

    Utilities.sleep(CONFIG.RATE_LIMIT_MS);
    if ((i + 1) % 20 === 0) _setMsg(`Progress: ${i + 1}/${contacts.length}`);
  }

  _setMsg(`Done. Sent: ${sent}, Failed: ${failed}`);
};

const _extractAllH1Titles = (rawHtml) => {
  // returns an array of clean H1 texts (in Doc order)
  const titles = [];
  const re = /<h1\b[^>]*>([\s\S]*?)<\/h1>/gi;
  let m;
  while ((m = re.exec(rawHtml)) !== null) {
    const inner = m[1] || "";
    const text = inner
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (text) titles.push(text);
  }
  // de-dupe while keeping order
  const seen = new Set();
  return titles.filter((t) => (seen.has(t) ? false : (seen.add(t), true)));
};

const _archiveListHtml = (titles, pageTitle) => {
  if (!titles || titles.length === 0) {
    return `<p>No editions found (no <code>Heading 1</code> in the Doc).</p>`;
  }
  const items = titles
    .map((t) => {
      const url = `?subject=${encodeURIComponent(t)}`;
      const title = _escapeHtml(t);
      return `  <li><a href="${url}" target="_top" rel="noopener">${title}</a></li>`;
    })
    .join("\n");
  return `
    <h1 style="margin:0 0 12px">${_escapeHtml(pageTitle)}</h1>
    <ol style="padding-left:20px; line-height:1.7">${items}</ol>
  `;
};

const _buildWebHtml = (
  title,
  contentHtml,
  footerHtml,
  baseUrl = "",
  iframe = false,
) => {
  const html = `
<!doctype html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  ${iframe ? `<base href="${baseUrl}" target="_top">` : ""}
  <title>${_escapeHtml(title)}</title>
  <style>
    :root{--fg:#111;--muted:#666;--max:780px}
    body{font:16px/1.6 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial;margin:24px;color:var(--fg);background:#fff}
    .wrap{max-width:var(--max);margin:0 auto}
    .doc{background:#fff}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="doc">${contentHtml}</div>
    <div class="footer" style="margin-top:48px;color:var(--muted);font-size:14px;line-height:1.4">
      ${footerHtml}
    </div>
  </div>
</body>
</html>`;
  return html;
};
