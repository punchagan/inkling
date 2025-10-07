const {
  _buildIndexHtml,
  _buildWebHtml,
  _extractEditionSection,
  _extractIntro,
  _extractPageStyle,
  _extractWrappedFooter,
} = require("../src/pure");
const { _composeEmailHtml, _prepareEmailBodyOnce } = require("../src/utils");

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

test("_buildIndexHtml", () => {
  const currDir = __dirname;
  const rawHtml = fs.readFileSync(currDir + "/fixtures/raw.html", "utf8");
  const parsed = HTMLParser.parse(rawHtml);
  const allow_subscriptions = true;
  const html = _buildIndexHtml(
    parsed,
    "My Newsletter",
    "netlify.example.com",
    "https://script.google.com/macros/s/exec",
    allow_subscriptions,
  );
  expect(html).toMatchSnapshot();
});

test("_composeEmailHtml", () => {
  const currDir = __dirname;
  const rawHtml = fs.readFileSync(currDir + "/fixtures/raw.html", "utf8");
  const parsed = HTMLParser.parse(rawHtml);
  const introHtml = _extractIntro(parsed);
  const footerHtml = _extractWrappedFooter(parsed);
  const section = _extractEditionSection(
    parsed,
    "Curiosities of the World",
    false,
  );
  expect(section).toBeDefined();
  const { bodyHtml } = _prepareEmailBodyOnce(introHtml, section, footerHtml);
  const html = _composeEmailHtml(
    "Alice",
    bodyHtml,
    "https://example.com/view-in-browser",
  );
  expect(html).toMatchSnapshot();
});
