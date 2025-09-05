const _slugify = (s) => {
  return String(s || "")
    .toLowerCase()
    .normalize("NFC")
    .replace(/[^\p{L}\p{N}\p{M}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
};

if (typeof module !== "undefined") {
  module.exports = {
    _slugify,
  };
}
