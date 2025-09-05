const _ensureName = (n) => String(n || "").trim() || "there";

const _isValidEmail = (e) => /^[^\s@]+@([^\s@.]+\.)+[^\s@.]+$/.test(e.trim());

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
    _isValidEmail,
    _slugify,
    _stripHtml,
  };
}
