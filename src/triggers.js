const onOpen = () => {
  SpreadsheetApp.getUi()
    .createMenu("Inkling")
    .addItem("Send test to me", "sendTestToMe")
    .addItem("Send to ALL CONTACTS!", "sendEmailsFromDoc")
    .addSeparator()
    .addItem("Open Web View", "_openWebViewDialog")
    .addItem("Open the Source Doc", "_openSourceDocDialog")
    .addSeparator()
    .addItem("Deploy site to Netlify", "deployToNetlify")
    .addItem("Open Netlify site", "openNetlifySite")
    .addToUi();
};
