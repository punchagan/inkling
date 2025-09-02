function doGet(e) {
  const docId = _getDocId();
  const rawDocHtml = _fetchDocHtml(docId);

  const subjectParam = e && e.parameter && e.parameter.subject;
  const subject = subjectParam ? String(subjectParam).trim() : "";

  const execBase = _getWebAppExecUrl();

  const webAppTitle = Drive.Files.get(docId).name || "Newsletter";
  let contentHtml;
  if (!subjectParam) {
    const titles = _extractAllH1Titles(rawDocHtml);
    contentHtml = _archiveListHtml(titles, webAppTitle);
  } else {
    contentHtml =
      _extractEditionSection(rawDocHtml, subject) ||
      (() => {
        const titles = _extractAllH1Titles(rawDocHtml);
        return `<p style="color:#b00">Couldn’t find “${_escapeHtml(
          subject,
        )}”.</p>${_archiveListHtml(titles, webAppTitle)}`;
      })();
  }

  const pageTitleText = subject
    ? `${subject} — ${webAppTitle}`
    : `${webAppTitle} — Archive`;

  const shell = `
<!doctype html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <base href="${execBase}" target="_top">  <!-- KEY LINE -->
  <title>${_escapeHtml(pageTitleText)}</title>
  <style>
    :root{--fg:#111;--muted:#666;--max:780px}
    body{font:16px/1.6 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial;margin:24px;color:var(--fg);background:#fff}
    .wrap{max-width:var(--max);margin:0 auto}
    .note{font-size:12px;color:var(--muted);margin-bottom:12px}
    .doc{background:#fff}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="note">Signed in with Google • Browser version${
      subject ? " • “" + _escapeHtml(subject) + "”" : ""
    }</div>
    <div class="doc">${contentHtml}</div>
  </div>
</body>
</html>`;
  return HtmlService.createHtmlOutput(shell).setXFrameOptionsMode(
    HtmlService.XFrameOptionsMode.ALLOWALL,
  );
}
