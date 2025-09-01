function sendTestToMe() {
  let me = Session.getActiveUser().getEmail();
  let name = "Tester";
  if (!me) {
    const contacts = _getContacts();
    if (contacts.length === 0)
      return _setMsg("No contacts found for a test send.", false);
    me = contacts[0][1];
    name = contacts[0][0];
  }
  let emailContacts = [[name, me, 2]];
  _sendEmailsFromDoc(emailContacts, true);
}

function sendEmailsFromDoc() {
  const contacts = _getContacts();
  if (contacts.length === 0)
    return _setMsg("No contacts found (A: Name, B: Email).", false);
  _sendEmailsFromDoc(contacts, false);
}
