/***** CONFIG – EDIT THESE *****/
const CONFIG = {
  // Example: "1A2B3C4D5E6F7G8H9I0J" (the long ID from your Google Doc URL)
  DOC_ID: null, // ← REQUIRED: Set this as Script Property in Project Settings
  SHEET: {
    SUBJECT_CELL: "D2", // email subject; must match the edition's H1
    MSG_CELL: "D4", // status messages from the script
    STATUS_COL: "C", // per-row status writeback
    CONTACTS_RANGE_START: "A2", // A: Name, B: Email
  },

  WEBAPP_TITLE: null, // null = use Doc's title
  SHOW_VIEW_IN_BROWSER_BANNER: true, // adds a “View in browser” link atop emails
  RATE_LIMIT_MS: 1200, // gentle pause between sends
};

/***** STYLES FOR SHEET MESSAGES *****/
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

/***** UTILITIES *****/
const _sheet = () => SpreadsheetApp.getActiveSheet();
const _setMsg = (msg, ok = true) =>
  _sheet()
    .getRange(CONFIG.SHEET.MSG_CELL)
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
function _getWebAppExecUrl() {
  const props = PropertiesService.getScriptProperties();
  const override = props.getProperty("WEBAPP_BASE_URL"); // preferred
  if (override) return String(override).replace(/\/dev$/, "/exec");
  try {
    const url = ScriptApp.getService().getUrl(); // fallback
    return url ? url.replace(/\/dev$/, "/exec") : "";
  } catch (_) {
    return "";
  }
}

/***** MENU *****/
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Newsletter")
    .addItem("Send from Doc", "sendEmailsFromDoc")
    .addItem("Send test to me", "sendTestToMe")
    .addSeparator()
    .addItem("Open Web View", "openWebView")
    .addToUi();
}

function openWebView() {
  const url = _getWebAppExecUrl();
  if (!url)
    return _setMsg(
      "Deploy the Web App first (Deploy → New deployment).",
      false,
    );
  SpreadsheetApp.getUi().alert(
    `Web View URL:\n\n${url}\n\n(You can pass ?subject=... to view older editions)`,
  );
}

/***** CONTACTS *****/
function _getContacts() {
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
}

/***** DOC → HTML (Advanced Drive Service) *****/
function _fetchDocHtml(docId) {
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
      "DOC_ID must be a Google Doc. Found: " +
        fileMeta.mimeType +
        ". Open the Doc and copy the ID from its URL.",
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
      "Drive export failed (" +
        code +
        "): " +
        resp2.getContentText().slice(0, 200),
    );
  }
}

/***** Extract the edition by H1 that matches the subject *****/
function _extractEditionSection(rawHtml, subject) {
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
      // Return this H1 and all content up to (but not including) the next H1
      const nextH1Index = section.search(/<h1\b[^>]*>/i);
      // 'section' already starts with H1; to cut before next H1 we need to look ahead in 'parts'
      // Simpler: rebuild as H1 + everything until the start of parts[i+1]
      const thisChunk = section;
      const nextChunk = parts[i + 1] || "";
      // The raw split kept the delimiter; the cleanest is just return this chunk;
      // because the split itself ensures next H1 starts next part.
      return thisChunk;
    }
  }
}

/* Get DOC_ID from Script Properties if not set in CONFIG */
function _getDocId() {
  if (CONFIG.DOC_ID) return CONFIG.DOC_ID;
  const props = PropertiesService.getScriptProperties();
  return props.getProperty("DOC_ID");
}

/** Prepare the Doc section ONCE for email (inline images, strip scripts).
 *  Returns { bodyHtml, inlineImages } – no greeting/banner/doctype here.
 */
function _prepareEmailBodyOnce(editionHtml) {
  let html = editionHtml;

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

  // Remove scripts for email safety
  html = html.replace(/<script[\s\S]*?<\/script>/gi, "");

  return { bodyHtml: html, inlineImages };
}

/** Compose the FINAL HTML per recipient (adds banner + greeting + body, and wraps with <!doctype>).
 *  Call this inside your send loop with each name.
 */
function _composeEmailHtml(name, bodyHtml, browserUrl) {
  const safeName = _escapeHtml(_sanitizeName(name));

  const banner =
    CONFIG.SHOW_VIEW_IN_BROWSER_BANNER && browserUrl
      ? `<div style="font:12px/1.4 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial;color:#555;background:#fafafa;padding:10px 12px;border-bottom:1px solid #eee;">
           Trouble viewing? <a href="${browserUrl}" target="_blank" rel="noopener">View in browser</a>
         </div>`
      : "";

  const greeting = `<div style="font:16px/1.5 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial;margin:20px 0;">
       Hi ${safeName},
     </div>`;

  const footer = `<div style="font:12px/1.5 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial;color:#777;margin-top:28px;">
       <!-- Optional footer text -->
     </div>`;

  return `<!doctype html>
<html>
  <head><meta charset="utf-8"></head>
  <body>
    ${banner}
    ${greeting}
    ${bodyHtml}
    ${footer}
  </body>
</html>`;
}

/***** SEND: main action – picks edition by subject, emails contacts *****/
function _sendEmailsFromDoc(contacts, test = true) {
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
  const { bodyHtml, inlineImages } = _prepareEmailBodyOnce(editionHtml);

  const emailSubject = test ? `[TEST] ${subject}` : subject;
  _setMsg(`Sending “${emailSubject}” to ${contacts.length}…`);

  const sh = _sheet();
  const statusCol = CONFIG.SHEET.STATUS_COL;
  let sent = 0,
    failed = 0;

  for (let i = 0; i < contacts.length; i++) {
    const [name, email, row] = contacts[i];
    const statusCell = sh.getRange(`${statusCol}${row}`);

    if (!_isValidEmail(email)) {
      statusCell.setValue("Invalid email").setTextStyle(_errStyle);
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
      statusCell
        .setValue(`Sent ${new Date().toLocaleString()}`)
        .setTextStyle(_okStyle);
      sent++;
    } catch (e) {
      statusCell.setValue(`Error: ${e.message || e}`).setTextStyle(_errStyle);
      failed++;
    }

    Utilities.sleep(CONFIG.RATE_LIMIT_MS);
    if ((i + 1) % 20 === 0) _setMsg(`Progress: ${i + 1}/${contacts.length}`);
  }

  _setMsg(`Done. Sent: ${sent}, Failed: ${failed}`);
}

/***** SEND TEST: sends current edition only to you (or first contact if Session email not available) *****/
function sendTestToMe() {
  let me = Session.getActiveUser().getEmail();
  let name = "Tester";
  if (!me) {
    const contacts = _getContacts();
    if (contacts.length === 0)
      return _setMsg("No contacts found for a test send.", false);
    me = contacts[0][1];
    name = contacts[0][0];
  }
  let emailContacts = [[name, me, 2]];
  _sendEmailsFromDoc(emailContacts, true);
}

function sendEmailsFromDoc() {
  const contacts = _getContacts();
  if (contacts.length === 0)
    return _setMsg("No contacts found (A: Name, B: Email).", false);
  _sendEmailsFromDoc(contacts, (test = false));
}

function _extractAllH1Titles(rawHtml) {
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
}

function _archiveListHtml(titles, pageTitle) {
  if (!titles || titles.length === 0) {
    return `<p>No editions found (no <code>Heading 1</code> in the Doc).</p>`;
  }
  const items = titles
    .map((t) => {
      const url = `?subject=${encodeURIComponent(t)}`; // relative; base+target will make it top-level /exec
      return `<li><a href="${url}" target="_top" rel="noopener">${_escapeHtml(
        t,
      )}</a></li>`;
    })
    .join("\n");
  return `
    <h1 style="margin:0 0 12px">${_escapeHtml(pageTitle)}</h1>
    <ol style="padding-left:20px; line-height:1.7">${items}</ol>
  `;
}

/***** WEB APP – shows the same edition in the browser (Google login via
 * deployment settings) *****/
function doGet(e) {
  const docId = _getDocId();
  const rawDocHtml = _fetchDocHtml(docId);

  const subjectParam = e && e.parameter && e.parameter.subject;
  const subject = subjectParam ? String(subjectParam).trim() : "";

  const execBase = _getWebAppExecUrl();

  const webAppTitle =
    CONFIG.WEBAPP_TITLE || Drive.Files.get(docId).name || "Newsletter";
  let contentHtml;
  if (!subjectParam) {
    const titles = _extractAllH1Titles(rawDocHtml);
    contentHtml = _archiveListHtml(titles, webAppTitle, execBase);
  } else {
    contentHtml =
      _extractEditionSection(rawDocHtml, subject) ||
      (() => {
        const titles = _extractAllH1Titles(rawDocHtml);
        return `<p style="color:#b00">Couldn’t find “${_escapeHtml(
          subject,
        )}”.</p>${_archiveListHtml(titles, webAppTitle, execBase)}`;
      })();
  }

  const pageTitleText = subject
    ? `${subject} — ${webAppTitle}`
    : `${webAppTitle} — Archive`;

  const shell = `
<!doctype html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <base href="${execBase}" target="_top">  <!-- KEY LINE -->
  <title>${_escapeHtml(pageTitleText)}</title>
  <style>
    :root{--fg:#111;--muted:#666;--max:780px}
    body{font:16px/1.6 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial;margin:24px;color:var(--fg);background:#fff}
    .wrap{max-width:var(--max);margin:0 auto}
    .note{font-size:12px;color:var(--muted);margin-bottom:12px}
    .doc{background:#fff}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="note">Signed in with Google • Browser version${
      subject ? " • “" + _escapeHtml(subject) + "”" : ""
    }</div>
    <div class="doc">${contentHtml}</div>
  </div>
</body>
</html>`;
  return HtmlService.createHtmlOutput(shell).setXFrameOptionsMode(
    HtmlService.XFrameOptionsMode.ALLOWALL,
  );
}
