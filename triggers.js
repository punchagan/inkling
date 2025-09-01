function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Inkling")
    .addItem("Send test to me", "sendTestToMe")
    .addItem("Send to ALL CONTACTS!", "sendEmailsFromDoc")
    .addSeparator()
    .addItem("Open Web View", "_openWebViewDialog")
    .addToUi();
}
