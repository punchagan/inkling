const CONFIG = {
  SHEET: {
    SUBJECT_CELL: "E2", // email subject; must match the edition's H1
    MSG_CELL: "E4", // status messages from the script
    SEND_COL: "C", // checkbox to send or skip
    STATUS_COL: "D", // per-row status writeback
    CONTACTS_RANGE_START: "A2", // A: Name, B: Email
  },
  SHOW_VIEW_IN_BROWSER_BANNER: true,
  RATE_LIMIT_MS: 1200,
};

const _composeEmailHtml = (name, bodyHtml, browserUrl) => {
  const safeName = _escapeHtml(_ensureName(name));

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

const _ensureName = (n) => String(n || "").trim() || "there";

const _escapeHtml = (s) =>
  String(s).replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
  );

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

const _isValidEmail = (e) => /^[^\s@]+@([^\s@.]+\.)+[^\s@.]+$/.test(e.trim());

const _neutralizeInlineFonts = (html) => {
  // Remove font-size / font-family from any style="..."
  html = html.replace(/style="([^"]*)"/gi, (m, styles) => {
    const cleaned = styles
      .replace(/(?:^|;)\s*font-size\s*:[^;"]*/gi, "")
      .replace(/(?:^|;)\s*font-family\s*:[^;"]*/gi, "")
      .replace(/^\s*;|\s*;$/g, "")
      .trim();
    return cleaned ? `style="${cleaned}"` : ""; // drop empty style=""
  });

  // (Optional) strip any <style> blocks that define class-based fonts
  return html.replace(/<style[\s\S]*?<\/style>/gi, "");
};

const _slugify = (s) => {
  return String(s || "")
    .toLowerCase()
    .normalize("NFC")
    .replace(/[^\p{L}\p{N}\p{M}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
};

const _stripHtml = (s) =>
  String(s)
    .replace(/<[^>]+>/g, " ")
    .trim();

if (typeof module !== "undefined") {
  module.exports = {
    _composeEmailHtml,
    _ensureName,
    _escapeHtml,
    _extractAllH1Titles,
    _extractEditionSection,
    _isValidEmail,
    _neutralizeInlineFonts,
    _slugify,
    _stripHtml,
  };
}
