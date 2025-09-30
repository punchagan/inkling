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
  const url = `https://docs.google.com/document/d/${docId}/edit`;
  const html = `<a href="${url}" target="_blank">Open the Source Document</a>`;
  SpreadsheetApp.getUi().showModalDialog(
    HtmlService.createHtmlOutput(html),
    "Open the Source Document",
  );
};

const _openEditionSelector = (test) => {
  const titles = _extractAllH1Titles(_fetchDocHtml(_getDocId()));
  if (!titles.length) {
    SpreadsheetApp.getUi().alert(
      "No editions found (no Heading 1 in the Doc).",
    );
    return;
  }
  const optionsHtml = titles
    .map(function (t, i) {
      // Escape to avoid HTML injection
      const label = _escapeHtml(t);
      const id = "opt_" + i;
      return `<label style="display:block;margin:6px 0">
            <input type="radio" name="edition" id="${id}" value="${label}" />
            ${label}
        </label>`;
    })
    .join("\n");

  const title = test ? "Send TEST Email to You" : "Select Email to EVERYONE";

  _setSubject(""); // Clear previous subject
  _setMsg("Select an edition to send", true);

  const html = `
<!doctype html><meta charset="utf-8">
<div style="font:14px/1.4 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial;padding:18px;max-width:520px">
  <h2 style="margin:0 0 8px">Choose edition</h2>
  <p style="margin:0 0 12px;color:${test ? "#555" : "red"}">
    ${
      test
        ? "This will send a TEST email to you."
        : "CAUTION: This will send an email to ALL contacts."
    }
  </p>
  <form id="editionForm">${optionsHtml}
    <div style="margin-top:16px;display:flex;gap:8px">
      <button type="submit">Confirm</button>
      <button type="button" id="cancel">Cancel</button>
    </div>
  </form>
  <p id="status" style="margin-top:12px;color:#555;font-size:13px"></p>
</div>
<script>
  const TEST = ${test ? "true" : "false"};
  const q = s => document.querySelector(s);
  q('#cancel').onclick = () => google.script.host.close();
  q('#editionForm').onsubmit = (e) => {
    e.preventDefault();
    const sel = document.querySelector('input[name="edition"]:checked');
    if (!sel) { alert('Please select an edition.'); return; }
    const title = sel.value;
    document.getElementById('status').textContent = TEST ? 'Sending test email…' : 'Sending to all contacts… This could take a while.';
    google.script.run
      .withSuccessHandler(() => google.script.host.close())
      .withFailureHandler(err => alert('Error: ' + (err && err.message ? err.message : err)))
      ._handleEditionChosen(title, TEST);
  };
</script>
`;

  SpreadsheetApp.getUi().showModalDialog(
    HtmlService.createHtmlOutput(html),
    `Inkling • ${title}`,
  );
};

const _setSubject = (subject) => {
  _sheet().getRange(CONFIG.SHEET.SUBJECT_CELL).setValue(subject);
};

const _handleEditionChosen = (title, test) => {
  _setSubject(title);
  _setMsg(`Subject set to “${title}”`);
  if (test) {
    _setMsg("Sending test…");
    sendTestToMe();
  } else {
    _setMsg("Sending to all…");
    sendEmailsFromDoc();
  }
};

const _getContacts = () => {
  const sh = _sheet();
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return [];
  const rng = sh
    .getRange(`${CONFIG.SHEET.CONTACTS_RANGE_START}:C${lastRow}`)
    .getValues();
  return rng
    .map(([name, email, sent], i) => [
      String(name || "").trim(),
      String(email || "").trim(),
      String(sent || "")
        .trim()
        .toLowerCase()
        .charAt(0) !== "n",
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

const _getDocId = () => {
  const props = PropertiesService.getScriptProperties();
  const docId = props.getProperty("DOC_ID");
  if (!docId) {
    SpreadsheetApp.getUi().alert("No DOC_ID found in Script Properties.");
    return;
  }
  return docId;
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
  footerHtml = _sanitizeDocHtml(footerHtml);
  let fullHtml = `${editionHtml}\n${footerHtml}`;
  let { html, inlineImages } = _prepareInlineImages(fullHtml);
  html = html.replace(/<script[\s\S]*?<\/script>/gi, "");
  return { bodyHtml: html, inlineImages };
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
        const footerRaw = section
          .replace(/<h2\b[^>]*>[\s\S]*?<\/h2>/i, "")
          .trim();
        const footer = _sanitizeDocHtml(footerRaw);
        return `<div style="font:12px/1.4 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial;padding:10px 12px;border-top:1px solid #eee;margin-top:24px;">${footer}</div>`;
      }
    }
  }
  return "";
};

const _articleURL = (subject, relative = false, forNetlify = false) => {
  const props = PropertiesService.getScriptProperties();
  const netlifyURL = props.getProperty("NETLIFY_URL");
  let webAppUrl;

  if (netlifyURL && forNetlify) {
    const slug = _slugify(subject);
    const path = `/article/${slug}.html`;
    webAppUrl = relative ? path : `${netlifyURL.replace(/\/$/, "")}${path}`;
  } else {
    const params = `?subject=${encodeURIComponent(subject)}`;
    webAppUrl = relative ? `${_getWebAppExecUrl()}${params}` : "";
  }

  return webAppUrl;
};

// RFC 2047 "encoded-word" for UTF-8 Subject
const _encodeRFC2047 = (s) => {
  const utf8 = Utilities.newBlob(String(s ?? "").normalize("NFC")).getBytes();
  const b64 = Utilities.base64Encode(utf8);
  return `=?UTF-8?B?${b64}?=`;
};

// Wrap base64 to 76 chars per MIME (safer across clients)
const _wrap76 = (s) => s.replace(/.{1,76}/g, "$&\r\n");

// Build a MIME message with multipart/related (html+inline images) and multipart/alternative (text/html)
const _buildMimeMessage = ({ to, subject, html, text, inlineImages }) => {
  const boundaryRel = "rel_" + Utilities.getUuid();
  const boundaryAlt = "alt_" + Utilities.getUuid();

  const headers = [
    `To: ${to}`,
    `Subject: ${_encodeRFC2047(subject)}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/related; boundary="${boundaryRel}"`,
  ].join("\r\n");

  const textPart = [
    `--${boundaryRel}`,
    `Content-Type: multipart/alternative; boundary="${boundaryAlt}"`,
    ``,
    `--${boundaryAlt}`,
    `Content-Type: text/plain; charset="UTF-8"`,
    `Content-Transfer-Encoding: base64`,
    ``,
    _wrap76(Utilities.base64Encode(text || _stripHtml(html || ""))),
    `--${boundaryAlt}`,
    `Content-Type: text/html; charset="UTF-8"`,
    `Content-Transfer-Encoding: base64`,
    ``,
    _wrap76(Utilities.base64Encode(html || "")),
    `--${boundaryAlt}--`,
  ].join("\r\n");

  const imageParts = [];
  if (inlineImages) {
    Object.keys(inlineImages).forEach((cid) => {
      const blob = inlineImages[cid];
      const mime = blob.getContentType() || "application/octet-stream";
      const ext = mime.split("/")[1] || "bin";
      imageParts.push(
        [
          `--${boundaryRel}`,
          `Content-Type: ${mime}`,
          `Content-Transfer-Encoding: base64`,
          `Content-ID: <${cid}>`,
          `Content-Disposition: inline; filename="${cid}.${ext}"`,
          ``,
          _wrap76(Utilities.base64Encode(blob.getBytes())),
        ].join("\r\n"),
      );
    });
  }

  const closing = `--${boundaryRel}--`;

  return `${headers}\r\n\r\n${textPart}\r\n${imageParts.join(
    "\r\n",
  )}\r\n${closing}`;
};

// Send via Gmail Advanced Service
const _sendEmailAdvanced = ({ to, subject, html, text, inlineImages }) => {
  const mime = _buildMimeMessage({ to, subject, html, text, inlineImages });
  const raw = Utilities.base64EncodeWebSafe(
    mime,
    Utilities.Charset.UTF_8,
  ).replace(/=+$/, "");
  Gmail.Users.Messages.send({ raw }, "me");
};

const _sendEmailsFromDoc = (contacts, test = true) => {
  const subject = _getSubject();

  const webAppUrl = _articleURL(subject, false, true);
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
      // Build per-recipient HTML you already have
      const personalizedHtml = _composeEmailHtml(name, bodyHtml, webAppUrl);

      _sendEmailAdvanced({
        to: email,
        subject: emailSubject, // keep your existing variable
        html: personalizedHtml, // includes your header/button/footer
        text: _stripHtml(personalizedHtml),
        inlineImages, // from _prepareEmailBodyOnce (cid:imgX)
      });

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

const _archiveListHtml = (titles, pageTitle, forNetlify) => {
  if (!titles || titles.length === 0) {
    return `<p>No editions found (no <code>Heading 1</code> in the Doc).</p>`;
  }
  const items = titles
    .map((t) => {
      const title = _escapeHtml(t);
      const url = _articleURL(title, true, forNetlify);
      return `  <li><a href="${url}" target="_top" rel="noopener">${title}</a></li>`;
    })
    .join("\n");
  return `
    <h1 style="margin:0 0 12px">${_escapeHtml(pageTitle)}</h1>
    <ol style="padding-left:20px; line-height:1.7">${items}</ol>
  `;
};

const _buildIndexHtml = (
  rawDocHtml,
  webAppTitle,
  subject = null,
  forNetlify = false,
) => {
  const titles = _extractAllH1Titles(rawDocHtml);
  let contentHtml = _archiveListHtml(titles, webAppTitle, forNetlify);
  if (subject) {
    const subject_ = `“${_escapeHtml(subject)}”`;
    const prefix = `<p style="color:#b00;margin:0 0 12px">Couldn’t find ${subject_}.</p>`;
    contentHtml = `${prefix}\n${contentHtml}`;
  }
  return contentHtml;
};
