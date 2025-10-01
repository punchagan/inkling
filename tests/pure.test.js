const {
  _composeEmailHtml,
  _ensureName,
  _escapeHtml,
  _extractAllH1Titles,
  _extractEditionSection,
  _extractIntro,
  _isValidEmail,
  _sanitizeDocHtml,
  _slugify,
  _stripHtml,
} = require("../src/pure");

test("_composeEmailHtml", () => {
  const browserUrl = "http://example.com";
  const banner = '<div style="background:#eee;padding:10px;">Banner</div>';
  const bodyHtml = "<p>This is the main content of the email.</p>";
  const greeting = '<div style="margin:10px 0;">Hello Alice,</div>';
  const intro = '<div style="margin:10px 0;">Intro text here.</div>';
  const fullHtml = `<!doctype html>
<html>
<body style="margin:0;padding:0;background:#ffffff;color:#111111;font:16px/1.5 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial">
  <div style="max-width:640px;margin:0 auto;padding:20px">
    <div style="margin-top:18px">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:16px 0">
         <tr>
           <td align="center" bgcolor="#0b66ff" style="border-radius:8px">
             <a href="http://example.com" target="_blank" rel="noopener"
                style="display:inline-block;padding:12px 16px;font:bold 14px/1.2 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial;color:#ffffff;text-decoration:none;border-radius:8px">
               Trouble reading the email? Read on the web!
             </a>
           </td>
         </tr>
       </table>
      <p style="margin:0 0 12px">Hi Alice,</p>
      <div style="margin:10px 0;">Intro text here.</div>
      <p>This is the main content of the email.</p>
    </div>
  </div>
</body>
</html>`;
  expect(_composeEmailHtml("Alice", intro, bodyHtml, browserUrl)).toBe(
    fullHtml,
  );
  expect(_composeEmailHtml("", intro, bodyHtml, browserUrl)).toBe(
    fullHtml.replace("Alice", "there"),
  );
  expect(_composeEmailHtml(null, intro, bodyHtml, browserUrl)).toBe(
    fullHtml.replace("Alice", "there"),
  );
  expect(_composeEmailHtml(" Bob ", intro, bodyHtml, browserUrl)).toBe(
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

test("_extractAllH1Titles", () => {
  const rawHtml = `
    <h2>Footer</h2>
    <p>This is the footer content.</p>
    <h1>&#10024; Edition 1 &mdash; Curiosities of the World</h1>
    <p>Content of the first edition.</p>
    <h1>&#127775; Edition 2 &mdash; Odd Histories &amp; Lists</h1>
    <p>Content of the second edition.</p>
    <h1>&#128221; Edition 3 &mdash; Short &amp; Sweet</h1>
    <p>Content of the third edition.</p>
    <h1>&#10024; Edition 1 &mdash; Curiosities of the World</h1>
    <p>Duplicate first edition.</p>
  `;
  expect(_extractAllH1Titles(rawHtml)).toEqual([
    "✨ Edition 1 — Curiosities of the World",
    "🌟 Edition 2 — Odd Histories & Lists",
    "📝 Edition 3 — Short & Sweet",
  ]);
  expect(_extractAllH1Titles("<p>No H1 here</p>")).toEqual([]);
  expect(_extractAllH1Titles("")).toEqual([]);
  expect(_extractAllH1Titles("<h1>  Spaced   Out  </h1>")).toEqual([
    "Spaced Out",
  ]);
  expect(_extractAllH1Titles("<h1>With <em>HTML</em> Tags</h1>")).toEqual([
    "With HTML Tags",
  ]);
});

test("_extractEditionSection", () => {
  const rawHtml = `
    <h2>Footer</h2>
    <p>This is the footer content.</p>
    <h1>&#10024; Edition 1 &mdash; Curiosities of the World</h1>
    <p>Content of the first edition.</p>
    <h1>&#127775; Edition 2 &mdash; Odd Histories &amp; Lists</h1>
    <p>Content of the second edition.</p>
    <h1>&#128221; Edition 3 &mdash; Short &amp; Sweet</h1>
    <p>Content of the third edition.</p>
  `;
  expect(
    _extractEditionSection(
      rawHtml,
      "🌟 Edition 2 — Odd Histories & Lists",
    ).trim(),
  ).toBe(
    `<h1>&#127775; Edition 2 &mdash; Odd Histories &amp; Lists</h1>
    <p>Content of the second edition.</p>`.trim(),
  );
  expect(
    _extractEditionSection(
      rawHtml,
      "✨ Edition 1 — Curiosities of the World",
    )?.trim(),
  ).toBe(
    `<h1>&#10024; Edition 1 &mdash; Curiosities of the World</h1>
    <p>Content of the first edition.</p>`.trim(),
  );
  expect(_extractEditionSection(rawHtml, "Nonexistent Edition")).toBe(
    undefined,
  );
});

test("_extractIntro", () => {
  const rawHtml = `
    <h2>Footer</h2>
    <p>This is the footer content.</p>
    <h2>Intro</h2>
    <p>Welcome to our newsletter!</p>
    <h1>Edition 1</h1>
    <p>Content of the first edition.</p>
    <h1>Edition 2</h1>
    <p>Content of the second edition.</p>
  `;
  expect(_extractIntro(rawHtml).trim()).toBe(
    `<p>Welcome to our newsletter!</p>`.trim(),
  );
  expect(_extractIntro("<h1>No Intro Here</h1>")).toBe("");
  expect(_extractIntro("<h2>Not Greeting</h2><p>Some text</p>")).toBe("");
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

test("_sanitizeDocHtml", () => {
  const input =
    '<p style="font-size:16px; font-family:Arial; color:red; display:block">Hello</p>' +
    '<div style="font-family:Verdana; margin:10px;">World</div>' +
    '<span style="font-size:12px;">Test font-size:</span>' +
    "<style>.custom { font-family:Courier; }</style>";
  const expected =
    '<p style="display:block">Hello</p>' +
    '<div style="margin:10px">World</div>' +
    "<span >Test font-size:</span>" +
    "";
  expect(_sanitizeDocHtml(input)).toBe(expected);
});

test("_slugify", () => {
  expect(_slugify("Hello, World!")).toBe("hello-world");
  expect(_slugify("Āčćénts & spaces")).toBe("āčćénts-spaces");
  expect(_slugify("  Leading and trailing  ")).toBe("leading-and-trailing");
  expect(_slugify("తెలుగు వికీపీడియా")).toBe("తెలుగు-వికీపీడియా");
  expect(_slugify("中文 测试")).toBe("中文-测试");
  expect(_slugify("&#10024; Edition 1 &mdash; Curiosities of the World")).toBe(
    "edition-1-curiosities-of-the-world",
  );
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
