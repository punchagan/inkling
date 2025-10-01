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

const _buildWebHtml = (
  webAppTitle,
  title,
  extraStyle,
  contentHtml,
  footerHtml,
  baseUrl = "",
  iframe = false,
) => {
  const pageTitle = webAppTitle !== title ? `${title} — ${webAppTitle}` : title;
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  ${iframe ? `<base href="${baseUrl}" target="_top">` : ""}
  <title>${_escapeHtml(pageTitle)}</title>
  <style>
    :root{--muted:#666;--link:#0b66ff;--card:#fafafa;--max:760px;--code:#f6f8fa;--border:#eee}
    body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.65 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial}
    .wrap{max-width:var(--max);margin:0 auto;padding:24px 16px 56px}
    header{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px}
    .brand{font-weight:700}
    .doc h1{font-size:1.9rem;line-height:1.2;margin:.2em 0 .6em}
    .doc h2{font-size:1.45rem;line-height:1.3;margin:1.4em 0 .6em}
    .doc h3{font-size:1.18rem;line-height:1.3;margin:1.1em 0 .5em}
    .doc p{margin:.75em 0}
    .doc a{color:var(--link)}
    .doc ol,.doc ul{padding-left:1.2em}
    .doc li{margin:.25em 0}
    .doc hr{border:0;border-top:1px solid var(--border);margin:1.5rem 0}
    .doc blockquote{margin:1em 0;padding:.6em .9em;border-left:3px solid var(--border);background:var(--card);border-radius:10px}
    .doc pre,.doc code,.doc kbd{font:.92rem/1.5 ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono",monospace}
    .doc pre{background:var(--code);border:1px solid var(--border);padding:12px;border-radius:12px;overflow:auto}
    .doc img{max-width:100%;height:auto;border-radius:10px}
    .footer{margin-top:28px;font-size:.95rem;color:var(--muted)}
  </style>
  <style>
    ${extraStyle}
  </style>
</head>
<body>
  <div class="wrap">
    <header><div class="brand"><a href="/">${_escapeHtml(
      webAppTitle,
    )}</a></div></header>
    <main class="doc">
      ${contentHtml}
      ${footerHtml ? `<div class="footer">${footerHtml}</div>` : ""}
    </main>
  </div>
</body>
</html>`;
  return html;
};

const _composeEmailHtml = (name, intro, bodyHtml, browserUrl) => {
  const safeName = _escapeHtml(_ensureName(name));
  const greeting = `<p style="margin:0 0 12px">Hi ${safeName},</p>`;
  const button = browserUrl
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:16px 0">
         <tr>
           <td align="center" bgcolor="#0b66ff" style="border-radius:8px">
             <a href="${browserUrl}" target="_blank" rel="noopener"
                style="display:inline-block;padding:12px 16px;font:bold 14px/1.2 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial;color:#ffffff;text-decoration:none;border-radius:8px">
               Trouble reading the email? Read on the web!
             </a>
           </td>
         </tr>
       </table>`
    : "";

  return `<!doctype html>
<html>
<body style="margin:0;padding:0;background:#ffffff;color:#111111;font:16px/1.5 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial">
  <div style="max-width:640px;margin:0 auto;padding:20px">
    <div style="margin-top:18px">
      ${button}
      ${greeting}
      ${intro}
      ${bodyHtml}
    </div>
  </div>
</body>
</html>`;
};

const _ensureName = (n) => String(n || "").trim() || "there";

const _escapeHtml = (s) =>
  String(s).replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
  );

const _extractPageStyle = (rawHtml) => {
  // Extract <style>…</style> from the <head></head>, if any
  const m = rawHtml.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i);
  if (m) {
    const head = m[1];
    const styles = [];
    const re = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
    let sm;
    while ((sm = re.exec(head)) !== null) {
      if (sm[1]) styles.push(sm[1].trim());
    }
    if (styles.length) return styles.join("\n");
  }
  return "";
};

const _extractAllH1Titles = (parsedHtml) => {
  // returns an array of clean H1 texts (in Doc order)
  if (!parsedHtml) return [];

  const titles = parsedHtml
    .querySelectorAll("h1")
    .map((h1) => h1.textContent.replace(/\s+/g, " ").trim());

  // de-dupe while keeping order
  const seen = new Set();
  return titles.filter((t) => (seen.has(t) ? false : (seen.add(t), true)));
};

const _extractEditionSection = (rawHtml, subject) => {
  // Split into chunks beginning at <h1 ...>
  const parts = rawHtml.split(/(?=<h1\b[^>]*>)/i);
  if (parts.length === 1) {
    // No H1s
    return;
  }

  const subjectSlug = _slugify(subject);

  for (let i = 1; i < parts.length; i++) {
    const section = parts[i]; // starts with <h1...>
    const m = section.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
    if (!m) continue;
    const sectionSlug = _slugify(_stripHtml(m[1]));
    if (sectionSlug === subjectSlug) {
      return section;
    }
  }
};

const _extractIntro = (rawHtml) => {
  // greeting is a <h2>Intro</h2> before the first <h1/>. If none, empty.
  const parts = rawHtml.split(/(?=<h1\b[^>]*>)/i);
  if (parts.length === 0) return "";
  const beforeFirstH1 = parts[0];
  const partsH2 = beforeFirstH1.split(/(?=<h2\b[^>]*>)/i);
  if (partsH2.length === 0) return "";
  // Look for a <h2>Greeting</h2>
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
      if (text === "intro") {
        const greetingRaw = section
          .replace(/<h2\b[^>]*>[\s\S]*?<\/h2>/i, "")
          .trim();
        return _sanitizeDocHtml(greetingRaw);
      }
    }
  }
  return "";
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

const _isValidEmail = (e) => /^[^\s@]+@([^\s@.]+\.)+[^\s@.]+$/.test(e.trim());

// Remove noisy Google Docs inline styles / unsafe attrs; keep structure.
const _sanitizeDocHtml = (html) => {
  if (!html) return "";
  // Drop script/style/meta/link tags
  html = String(html)
    .replace(/<(script|style|meta|link)\b[\s\S]*?<\/\1>/gi, "")
    .replace(/<(script|style|meta|link)\b[^>]*>/gi, "");
  // Remove on* handlers and data-* attributes
  html = html
    .replace(/\son[a-z]+="[^"]*"/gi, "")
    .replace(/\sdata-[\w-]+="[^"]*"/gi, "");
  // Strip font/color/background from style=""
  html = html.replace(
    /\sstyle="[^"]*?(font-(family|size)|color|background)[^"]*"/gi,
    (m) => {
      const kept = m
        .replace(/(font-(family|size)|color|background)\s*:[^;"]*;?/gi, "")
        .trim();
      return kept ? ` ${kept}` : "";
    },
  );
  // Normalize empties & convert <p><strong>…</strong></p> → <h3>…</h3>
  html = html
    .replace(/<(p|div|span)[^>]*>\s*<\/\1>/gi, "")
    .replace(/<p>\s*<strong>(.*?)<\/strong>\s*<\/p>/gi, "<h3>$1</h3>")
    .replace(/\u00A0/g, " "); // NBSP → space

  // Remove font-size / font-family from any style="..."
  html = html.replace(/style="([^"]*)"/gi, (m, styles) => {
    const cleaned = styles
      .replace(/(?:^|;)\s*font-size\s*:[^;"]*/gi, "")
      .replace(/(?:^|;)\s*font-family\s*:[^;"]*/gi, "")
      .replace(/^\s*;|\s*;$/g, "")
      .trim();
    return cleaned ? `style="${cleaned}"` : ""; // drop empty style=""
  });
  return html.trim();
};

const _sha1Hex = (bytes) => {
  const dig = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_1, bytes);
  return dig.map((b) => ("0" + (b & 0xff).toString(16)).slice(-2)).join("");
};

// Minimal entity map for common named entities you might see in Docs/HTML exports
const _HTML_ENTITIES = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ", // treat NBSP as a space
  ensp: " ",
  emsp: " ",
  ndash: "–",
  mdash: "—",
  hellip: "…",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
};

const _decodeHtmlEntities = (s) =>
  String(s || "")
    // numeric decimal: &#10024;
    .replace(/&#(\d+);/g, (_, d) => {
      try {
        return String.fromCodePoint(Number(d));
      } catch {
        return _;
      }
    })
    // numeric hex: &#x2014; or &#X2014;
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => {
      try {
        return String.fromCodePoint(parseInt(h, 16));
      } catch {
        return _;
      }
    })
    // named: &mdash; &nbsp; etc.
    .replace(
      /&([a-zA-Z][a-zA-Z0-9]+);/g,
      (m, name) => _HTML_ENTITIES[name.toLowerCase()] ?? m,
    );

const _slugify = (s) => {
  return _decodeHtmlEntities(s)
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
    _buildWebHtml,
    _composeEmailHtml,
    _ensureName,
    _escapeHtml,
    _extractAllH1Titles,
    _extractEditionSection,
    _extractIntro,
    _extractPageStyle,
    _extractWrappedFooter,
    _isValidEmail,
    _sanitizeDocHtml,
    _sha1Hex,
    _slugify,
    _stripHtml,
  };
}
