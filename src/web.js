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

  const html = _buildWebHtml(
    pageTitleText,
    contentHtml,
    footerHtml,
    execBase,
    (iframe = true),
  );

  return HtmlService.createHtmlOutput(html).setXFrameOptionsMode(
    HtmlService.XFrameOptionsMode.ALLOWALL,
  );
};
