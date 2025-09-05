const { _slugify, _isValidEmail } = require("../src/pure");

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
