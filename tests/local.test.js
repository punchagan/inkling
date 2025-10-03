const {
  _extractEditionSection,
  _extractPageStyle,
  _extractWrappedFooter,
  _buildWebHtml,
} = require("../src/pure");
const fs = require("fs");
const HTMLParser = require("node-html-parser");
global.HTMLParser = HTMLParser;

test("_buildWebHtml", () => {
  const currDir = __dirname;
  const rawHtml = fs.readFileSync(currDir + "/fixtures/raw.html", "utf8");
  const parsed = HTMLParser.parse(rawHtml);
  const section = _extractEditionSection(
    parsed,
    "Curiosities of the World",
    true,
  );
  expect(section).toBeDefined();
  const footerHtml = _extractWrappedFooter(parsed);
  const extraStyle = _extractPageStyle(parsed);
  const html = _buildWebHtml(
    "My Newsletter",
    "Welcome to my newsletter",
    extraStyle,
    section,
    footerHtml,
  );

  expect(html).toMatchSnapshot();
});
