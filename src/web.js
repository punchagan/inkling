const doGet = (e) => {
  const docId = _getDocId();
  const parsedHtml = HTMLParser.parse(_fetchDocHtml(docId));
  const subjectParam = e && e.parameter && e.parameter.subject;
  const subject = subjectParam ? String(subjectParam).trim() : "";
  const execBase = _getWebAppExecUrl();
  const webAppTitle = _getWebAppTitle(docId);
  let contentHtml;

  const actionParam = e && e.parameter && e.parameter.action;

  // Add subscribe form at the bottom of the Index page
  const allow_subscriptions = _getProperty("WEBAPP_ALLOW_SUBSCRIBE") === "true";

  let pageStyle = _extractPageStyle(parsedHtml);

  if (actionParam === "subscribe") {
    if (allow_subscriptions) {
      contentHtml = _subscribeFormHtml(execBase);
    } else {
      contentHtml = `<p style="color:red;">Subscriptions are not allowed.</p>`;
    }
  } else if (subject) {
    contentHtml = _extractEditionSection(parsedHtml, subject, true);
  }
  if (!contentHtml) {
    contentHtml = _buildIndexHtml(
      parsedHtml,
      webAppTitle,
      execBase,
      execBase,
      allow_subscriptions,
      subject,
    );
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

const doPost = (e) => {
  const allow_subscriptions = _getProperty("WEBAPP_ALLOW_SUBSCRIBE") === "true";
  if (!allow_subscriptions) {
    return HtmlService.createHtmlOutput(
      `<p style="color:red;">Subscriptions are not allowed.</p>`,
    );
  }

  // Handle subscription form submission from the web app
  const params = e && e.parameter ? e.parameter : {};
  const email = params.email ? String(params.email).trim() : "";
  const name = params.name ? String(params.name).trim() : "";
  const returnParam = params.return ? String(params.return).trim() : "";
  const goBackTo = _safeReturnUrl(returnParam);
  const honeypot = params.phone ? String(params.phone).trim() : "";

  if (honeypot) {
    // Bot submission; ignore
    return _redirectHtml(goBackTo, "Thank you for subscribing!");
  }

  if (!email || !_isValidEmail(email)) {
    return _redirectHtml(
      goBackTo,
      "Invalid email address. Please go back and try again.",
    );
  }

  // Add details to subscrptions sheet
  const sheet = _getSubscriptionsSheet();
  sheet.appendRow([new Date(), name, email]);
  return _redirectHtml(goBackTo, "Thank you for subscribing!");
};
