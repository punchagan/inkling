const { _slugify, _isValidEmail, _stripHtml } = require("../src/pure");

test("_slugify", () => {
  expect(_slugify("Hello, World!")).toBe("hello-world");
  expect(_slugify("Āčćénts & spaces")).toBe("āčćénts-spaces");
  expect(_slugify("  Leading and trailing  ")).toBe("leading-and-trailing");
  expect(_slugify("తెలుగు వికీపీడియా")).toBe("తెలుగు-వికీపీడియా");
  expect(_slugify("中文 测试")).toBe("中文-测试");
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
