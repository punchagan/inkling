const _ensureName = (n) => String(n || "").trim() || "there";

const _escapeHtml = (s) =>
  String(s).replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
  );

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
    _ensureName,
    _escapeHtml,
    _isValidEmail,
    _neutralizeInlineFonts,
    _slugify,
    _stripHtml,
  };
}
