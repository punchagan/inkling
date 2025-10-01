const {
  _extractEditionSection,
  _extractPageStyle,
  _extractWrappedFooter,
  _buildWebHtml,
} = require("../src/pure");
const fs = require("fs");

test("_buildWebHtml", () => {
  const currDir = __dirname;
  const rawHtml = fs.readFileSync(currDir + "/fixtures/raw.html", "utf8");
  const section = _extractEditionSection(rawHtml, "Curiosities of the World");
  expect(section).toBeDefined();
  const footerHtml = _extractWrappedFooter(rawHtml);
  const extraStyle = _extractPageStyle(rawHtml);
  const html = _buildWebHtml(
    "My Newsletter",
    "Welcome to my newsletter",
    extraStyle,
    section,
    footerHtml,
  );

  // Write it to a temp file in /tmp for manual inspection if needed
  const path = "/tmp/test_buildWebHtml.html";
  fs.writeFileSync(path, html, "utf8");
  console.log(`Wrote test HTML to file://${path}`);
});
