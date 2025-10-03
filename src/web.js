const doGet = (e) => {
  const docId = _getDocId();
  const parsedHtml = HTMLParser.parse(_fetchDocHtml(docId));
  const subjectParam = e && e.parameter && e.parameter.subject;
  const subject = subjectParam ? String(subjectParam).trim() : "";
  const execBase = _getWebAppExecUrl();
  const webAppTitle = _getWebAppTitle(docId);
  let contentHtml;

  let pageStyle = _extractPageStyle(parsedHtml);

  if (subject) {
    contentHtml = _extractEditionSection(parsedHtml, subject, true);
  }
  if (!contentHtml) {
    contentHtml = _buildIndexHtml(parsedHtml, webAppTitle, subject, false);
  }
  const pageTitleText = subject
    ? `${subject} — ${webAppTitle}`
    : `${webAppTitle} — Archive`;
  const footerHtml = _extractWrappedFooter(parsedHtml);
  const html = _buildWebHtml(
    webAppTitle,
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
