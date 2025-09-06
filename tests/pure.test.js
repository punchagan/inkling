const {
  _composeEmailHtml,
  _ensureName,
  _escapeHtml,
  _extractEditionSection,
  _isValidEmail,
  _neutralizeInlineFonts,
  _slugify,
  _stripHtml,
} = require("../src/pure");

test("_composeEmailHtml", () => {
  const browserUrl = "http://example.com";
  const banner = '<div style="background:#eee;padding:10px;">Banner</div>';
  const bodyHtml = "<p>This is the main content of the email.</p>";
  const greeting = '<div style="margin:10px 0;">Hello Alice,</div>';
  const fullHtml = `<!doctype html>
<html>
  <head><meta charset="utf-8"></head>
  <body>
    <div style="font:12px/1.4 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial;color:#555;background:#fafafa;padding:10px 12px;border-bottom:1px solid #eee;">
           Trouble viewing? <a href="${browserUrl}" target="_blank" rel="noopener">View in browser</a>
         </div>
    <div style="font:16px/1.5 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial;margin:20px 0;">
       Hi Alice,
     </div>
    ${bodyHtml}
  </body>
</html>`;
  expect(_composeEmailHtml("Alice", bodyHtml, browserUrl)).toBe(fullHtml);
  expect(_composeEmailHtml("", bodyHtml, browserUrl)).toBe(
    fullHtml.replace("Alice", "there"),
  );
  expect(_composeEmailHtml(null, bodyHtml, browserUrl)).toBe(
    fullHtml.replace("Alice", "there"),
  );
  expect(_composeEmailHtml(" Bob ", bodyHtml, browserUrl)).toBe(
    fullHtml.replace("Alice", "Bob"),
  );
});

test("_ensureName", () => {
  expect(_ensureName("Alice")).toBe("Alice");
  expect(_ensureName("  Bob  ")).toBe("Bob");
  expect(_ensureName("")).toBe("there");
  expect(_ensureName(null)).toBe("there");
  expect(_ensureName(undefined)).toBe("there");
});

test("_escapeHtml", () => {
  expect(_escapeHtml("")).toBe("");
  expect(_escapeHtml("No special chars")).toBe("No special chars");
  expect(_escapeHtml("<div>Hello & welcome!</div>")).toBe(
    "&lt;div&gt;Hello &amp; welcome!&lt;/div&gt;",
  );
  expect(_escapeHtml('She said, "Hello!"')).toBe(
    "She said, &quot;Hello!&quot;",
  );
});

test("_extractEditionSection", () => {
  const rawHtml = `
    <h2>Footer</h2>
    <p>This is the footer content.</p>
    <h1>First Edition</h1>
    <p>Content of the first edition.</p>
    <h1>Second Edition</h1>
    <p>Content of the second edition.</p>
    <h1>Third Edition</h1>
    <p>Content of the third edition.</p>
  `;
  expect(_extractEditionSection(rawHtml, "Second Edition").trim()).toBe(
    `<h1>Second Edition</h1>
    <p>Content of the second edition.</p>`.trim(),
  );
  expect(_extractEditionSection(rawHtml, "First Edition").trim()).toBe(
    `<h1>First Edition</h1>
    <p>Content of the first edition.</p>`.trim(),
  );
  expect(_extractEditionSection(rawHtml, "Nonexistent Edition")).toBe(
    undefined,
  );
});

test("_isValidEmail", () => {
  expect(_isValidEmail("")).toBe(false);
  expect(_isValidEmail("plainaddress")).toBe(false);
  expect(_isValidEmail("@missingusername.com")).toBe(false);
  expect(_isValidEmail("username@.com")).toBe(false);
  expect(_isValidEmail("username@domain")).toBe(false);
  expect(_isValidEmail("username@domain..com")).toBe(false);
  expect(_isValidEmail("user@domain.com")).toBe(true);
  expect(_isValidEmail("user@domain.co.in")).toBe(true);
});

test("_neutralizeInlineFonts", () => {
  const input =
    '<p style="font-size:16px; font-family:Arial; color:red;">Hello</p>' +
    '<div style="font-family:Verdana; margin:10px;">World</div>' +
    '<span style="font-size:12px;">Test font-size:</span>' +
    "<style>.custom { font-family:Courier; }</style>";
  const expected =
    '<p style="color:red">Hello</p>' +
    '<div style="margin:10px">World</div>' +
    "<span >Test font-size:</span>" +
    "";
  expect(_neutralizeInlineFonts(input)).toBe(expected);
});

test("_slugify", () => {
  expect(_slugify("Hello, World!")).toBe("hello-world");
  expect(_slugify("Āčćénts & spaces")).toBe("āčćénts-spaces");
  expect(_slugify("  Leading and trailing  ")).toBe("leading-and-trailing");
  expect(_slugify("తెలుగు వికీపీడియా")).toBe("తెలుగు-వికీపీడియా");
  expect(_slugify("中文 测试")).toBe("中文-测试");
});

test("_stripHtml", () => {
  expect(_stripHtml("")).toBe("");
  expect(_stripHtml("No HTML here")).toBe("No HTML here");
  expect(_stripHtml("<p>This is a <strong>test</strong>.</p>")).toBe(
    "This is a  test .",
  );
  expect(
    _stripHtml('<a href="http://example.com">Link</a> and <br> line break'),
  ).toBe("Link  and   line break");
});
