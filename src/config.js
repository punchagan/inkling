const CONFIG = {
  SHEET: {
    SUBJECT_CELL: "E2", // email subject; must match the edition's H1
    MSG_CELL: "E4", // status messages from the script
    SEND_COL: "C", // checkbox to send or skip
    STATUS_COL: "D", // per-row status writeback
    CONTACTS_RANGE_START: "A2", // A: Name, B: Email
  },
  RATE_LIMIT_MS: 1200,
};

const CONFIG_PROPERTIES = {
  // Content Google Doc
  DOC_ID: "",
  // Web app settings
  WEBAPP_BASE_URL: "",
  // Netlify settings
  NETLIFY_SITE_ID: "",
  NETLIFY_TOKEN: "",
  NETLIFY_URL: "",
  // Email settings
  // Sender name (e.g. "Alice from Inkling")
  EMAIL_SENDER_NAME: "",
  EMAIL_SHOW_WEB_LINK: true,
};

const setupProperties = () => {
  // Initialize script properties if not set
  // (only needs to be done once). But, idempotent.
  const props = PropertiesService.getScriptProperties();
  Object.entries(CONFIG_PROPERTIES).forEach(([key, def]) => {
    if (props.getProperty(key) === null) {
      props.setProperty(key, def);
    }
  });
};
