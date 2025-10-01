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

const _extractAllH1Titles = (parsedHtml) => {
  // returns an array of clean H1 texts (in Doc order)
  if (!parsedHtml) return [];

  const titles = parsedHtml
    .querySelectorAll("h1")
    .map((h1) => h1.textContent.replace(/\s+/g, " ").trim());

  // de-dupe while keeping order
  const seen = new Set();
  return titles.filter((t) => {
    if (t === "" || !t || seen.has(t)) return false;
    seen.add(t);
    return true;
  });
};

const _extractEditionSection = (parsedHtml, subject) => {
  if (!parsedHtml) return undefined;

  const targetSlug = _slugify(subject);
  const h1s = parsedHtml.querySelectorAll("h1");
  if (!h1s.length) return undefined;

  // 1) find the <h1> whose slug matches
  let startH1 = null;
  for (const h of h1s) {
    const text = h.textContent.replace(/\s+/g, " ").trim();
    const slug = _slugify(text);
    if (slug === targetSlug) {
      startH1 = h;
      break;
    }
  }
  if (!startH1) return undefined;

  // If the body has a width in pt, set image widths as % of that width to make
  // page responsive
  const bodyWidth = _getBodyWidth(parsedHtml);
  if (bodyWidth) _setImageWidths(parsedHtml, bodyWidth);

  // 2) collect this <h1> and subsequent siblings until the next <h1>
  const pieces = [];
  let n = startH1;
  while (n) {
    pieces.push(n.toString());
    n = n.nextElementSibling;
    if (n && n.tagName && n.tagName.toLowerCase() === "h1") break;
  }
  return pieces.join("");
};

const _extractH2 = (parsedHtml, text) => {
  // intro is a <h2>Intro</h2> before the first <h1/>. If none, empty.

  const firstH1 = parsedHtml.querySelector("h1");

  let prefixHtml = "";
  if (!firstH1) {
    prefixHtml = parsedHtml.toString();
  } else {
    const parent = firstH1.parentNode;
    const beforeNodes = [];
    for (const node of parent.childNodes) {
      if (firstH1 && node === firstH1) break;
      beforeNodes.push(node);
    }
    if (beforeNodes.length === 0) return "";
    prefixHtml = beforeNodes.map((n) => n.toString()).join("");
  }

  const prefixRoot = HTMLParser.parse(prefixHtml);
  let n = prefixRoot.querySelectorAll("h2").find((h2) => {
    const h2Text = h2.textContent.trim().toLowerCase();
    return h2Text === text.toLowerCase();
  });
  if (!n) return "";

  const pieces = [];
  n = n.nextElementSibling;
  while (n) {
    if (n.tagName && n.tagName.toLowerCase() === "h2") break;
    pieces.push(n.toString());
    n = n.nextElementSibling;
  }
  const html = pieces.join("").trim();
  return html !== "" ? _sanitizeDocHtml(html) : "";
};

const _extractIntro = (parsedHtml) => _extractH2(parsedHtml, "Intro");

const _extractPageStyle = (parsedHtml) => {
  // Extract <style>…</style> from the <head></head>, if any

  if (!parsedHtml) return "";
  const head = parsedHtml.querySelector("head");
  if (!head) return "";

  const styles = head.querySelectorAll("style");
  if (!styles.length) return "";
  return styles.map((s) => s.textContent.trim()).join("\n");
};

const _extractWrappedFooter = (parsedHtml) => {
  // footer is a <h2>Footer</h2> before the first <h1/>. If none, empty.
  const footer = _extractH2(parsedHtml, "Footer");
  if (!footer || footer === "") return "";
  return `<div style="font:12px/1.4 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial;padding:10px 12px;border-top:1px solid #eee;margin-top:24px;">${footer}</div>`;
};

const _getBodyWidth = (parsedHtml) => {
  if (!parsedHtml) return undefined;
  const body = parsedHtml.querySelector("body");
  if (!body) return undefined;
  const style = body.getAttribute("style") || "";
  const widthPt = _getValueFromStyle(style, "width", "pt");
  if (widthPt) {
    return widthPt * 1.3333; // pt to px
  }
};

const _getValueFromStyle = (style, key, unit) => {
  const regex = new RegExp(`${key}:\\s*([0-9.]+)${unit}`, "i");
  const match = style.match(regex);
  return match ? parseFloat(match[1].trim(), 10) : null;
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

const _setImageWidths = (parsedHtml, bodyWidth) => {
  // Set image widths as % of body width, removing any px-based width/height
  // from the image and its parent.

  if (!parsedHtml) return;
  const images = parsedHtml.querySelectorAll("img");
  images.forEach((img) => {
    const style = img.getAttribute("style") || "";
    const width = _getValueFromStyle(style, "width", "px");
    const widthPercent = Math.min((width / bodyWidth) * 100, 100);

    // Remove any existing width and height in px
    let newStyle = style
      .replace(/width:\s*[0-9.]+px;?/gi, "")
      .replace(/height:\s*[0-9.]+px;?/gi, "")
      .trim();
    img.setAttribute("style", newStyle);

    const parent = img.parentNode;
    const parentStyle = parent.getAttribute("style") || "";
    let newParentStyle = parentStyle
      .replace(/width:\s*[0-9.]+px;?/gi, "")
      .replace(/height:\s*[0-9.]+px;?/gi, "")
      .trim();

    newParentStyle += `;width:${widthPercent.toFixed(2)}%`;
    parent.setAttribute("style", newParentStyle);
  });
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
