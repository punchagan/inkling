// Load a snapshot from __snapshots__ folder and display it in a web page

const fs = require("fs");
const open = require("open");

// Snapshot test name is passed as a command line argument
const testName = process.argv[2];
if (!testName) {
  console.error("Please provide a test name as a command line argument.");
  process.exit(1);
}

const snapshotKey = `${testName} 1`;
const trimEdgeQuotes = (s) => String(s).replace(/^"+|"+$/g, "");
const snapshot = require("./__snapshots__/local.test.js.snap");
const snapshotHtml = trimEdgeQuotes(snapshot[snapshotKey].trim());
if (!snapshotHtml) {
  console.error(`No snapshot found for test name: ${testName}`);
  process.exit(1);
}

const tempFilePath = "/tmp/snapshot_view.html";
fs.writeFileSync(tempFilePath, snapshotHtml, "utf8");
open.default(tempFilePath);
console.log(
  `Snapshot written to ${tempFilePath}, and opened in your default browser.`,
);
// Clean up the temporary file after a delay. Once the browser has opened it,
// we can delete it.
setTimeout(() => fs.unlinkSync(tempFilePath), 3000);
