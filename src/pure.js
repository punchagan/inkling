const _slugify = (s) => {
  return String(s || "")
    .toLowerCase()
    .normalize("NFC")
    .replace(/[^\p{L}\p{N}\p{M}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
};

const _isValidEmail = (e) => /^[^\s@]+@([^\s@.]+\.)+[^\s@.]+$/.test(e.trim());

const _stripHtml = (s) =>
  String(s)
    .replace(/<[^>]+>/g, " ")
    .trim();

if (typeof module !== "undefined") {
  module.exports = {
    _slugify,
    _isValidEmail,
    _stripHtml,
  };
}
