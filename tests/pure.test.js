const { _slugify } = require("../src/pure");

test("_slugify", () => {
  expect(_slugify("Hello, World!")).toBe("hello-world");
});
