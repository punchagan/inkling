const doGet = (e) => {
  const docId = _getDocId();
  const rawDocHtml = _fetchDocHtml(docId);
  const parsedHtml = HTMLParser.parse(rawDocHtml);
  const subjectParam = e && e.parameter && e.parameter.subject;
  const subject = subjectParam ? String(subjectParam).trim() : "";
  const execBase = _getWebAppExecUrl();
  const webAppTitle = Drive.Files.get(docId).name || "Newsletter";
  let contentHtml;

  let pageStyle = _extractPageStyle(rawDocHtml);

  if (subject) {
    contentHtml = _extractEditionSection(parsedHtml, subject);
  }
  if (!contentHtml) {
    contentHtml = _buildIndexHtml(rawDocHtml, webAppTitle, subject);
  }
  const pageTitleText = subject
    ? `${subject} — ${webAppTitle}`
    : `${webAppTitle} — Archive`;
  const footerHtml = _extractWrappedFooter(rawDocHtml);
  const html = _buildWebHtml(
    pageTitleText,
    pageStyle,
    contentHtml,
    footerHtml,
    execBase,
    (iframe = true),
  );

  return HtmlService.createHtmlOutput(html).setXFrameOptionsMode(
    HtmlService.XFrameOptionsMode.ALLOWALL,
  );
};
