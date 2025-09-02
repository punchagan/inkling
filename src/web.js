const doGet = (e) => {
  const docId = _getDocId();
  const rawDocHtml = _fetchDocHtml(docId);
  const subjectParam = e && e.parameter && e.parameter.subject;
  const subject = subjectParam ? String(subjectParam).trim() : "";
  const execBase = _getWebAppExecUrl();
  const webAppTitle = Drive.Files.get(docId).name || "Newsletter";
  let contentHtml;

  if (subject) {
    contentHtml = _extractEditionSection(rawDocHtml, subject);
  }

  const footerHtml = _extractWrappedFooter(rawDocHtml);

  if (!contentHtml) {
    const titles = _extractAllH1Titles(rawDocHtml);
    contentHtml = _archiveListHtml(titles, webAppTitle);
    if (subject) {
      const subject_ = `“${_escapeHtml(subject)}”`;
      const prefix = `<p style="color:#b00">Couldn’t find ${subject_}".</p>`;
      contentHtml = `${prefix}\n${contentHtml}`;
    }
  }

  const pageTitleText = subject
    ? `${subject} — ${webAppTitle}`
    : `${webAppTitle} — Archive`;

  const shell = `
<!doctype html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <base href="${execBase}" target="_top">
  <title>${_escapeHtml(pageTitleText)}</title>
  <style>
    :root{--fg:#111;--muted:#666;--max:780px}
    body{font:16px/1.6 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial;margin:24px;color:var(--fg);background:#fff}
    .wrap{max-width:var(--max);margin:0 auto}
    .doc{background:#fff}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="doc">${contentHtml}</div>
    <div class="footer" style="margin-top:48px;color:var(--muted);font-size:14px;line-height:1.4">
      ${footerHtml}
    </div>
  </div>
</body>
</html>`;
  return HtmlService.createHtmlOutput(shell).setXFrameOptionsMode(
    HtmlService.XFrameOptionsMode.ALLOWALL,
  );
};
