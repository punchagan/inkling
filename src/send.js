const sendTestToMe = () => {
  let me = Session.getActiveUser().getEmail();
  if (!me) {
    return _setMsg("No contacts found for a test send.", false);
  }
  let emailContacts = [["Tester", me, 2]];
  _sendEmailsFromDoc(emailContacts, true);
};

const sendEmailsFromDoc = () => {
  const contacts = _getContacts()
    .filter(([name, email, send, idx]) => send)
    .map(([name, email, _, idx]) => [name, email, idx]);
  if (contacts.length === 0)
    return _setMsg("No contacts found (A: Name, B: Email).", false);
  _sendEmailsFromDoc(contacts, false);
};

const openEditionSelectorTest = () => {
  _openEditionSelector(true);
};

const openEditionSelectorAllContacts = () => {
  _openEditionSelector(false);
};
