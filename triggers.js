function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Newsletter")
    .addItem("Send from Doc", "sendEmailsFromDoc")
    .addItem("Send test to me", "sendTestToMe")
    .addSeparator()
    .addItem("Open Web View", "_openWebViewDialog")
    .addToUi();
}
