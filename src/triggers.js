const onOpen = () => {
  SpreadsheetApp.getUi()
    .createMenu("Inkling")
    .addItem("Send test to me", "openEditionSelectorTest")
    .addItem("Send to ALL CONTACTS!", "openEditionSelectorAllContacts")
    .addSeparator()
    .addItem("Open Web View", "_openWebViewDialog")
    .addItem("Open the Source Doc", "_openSourceDocDialog")
    .addSeparator()
    .addItem("Deploy site to Netlify", "deployToNetlify")
    .addItem("Open Netlify site", "openNetlifySite")
    .addSeparator()
    .addItem("Setup Properties", "setupProperties")
    .addToUi();
};
