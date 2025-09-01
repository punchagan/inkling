function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Inkling")
    .addItem("Send test to me", "sendTestToMe")
    .addItem("Send from Doc", "sendEmailsFromDoc")
    .addSeparator()
    .addItem("Open Web View", "_openWebViewDialog")
    .addToUi();
}
