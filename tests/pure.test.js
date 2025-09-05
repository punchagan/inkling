const { _slugify } = require("../src/pure");

test("_slugify", () => {
  expect(_slugify("Hello, World!")).toBe("hello-world");
  expect(_slugify("Āčćénts & spaces")).toBe("āčćénts-spaces");
  expect(_slugify("  Leading and trailing  ")).toBe("leading-and-trailing");
  expect(_slugify("తెలుగు వికీపీడియా")).toBe("తెలుగు-వికీపీడియా");
  expect(_slugify("中文 测试")).toBe("中文-测试");
});
