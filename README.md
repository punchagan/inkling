# Inkling

Inkling is a tiny toolkit to publish a personal newsletter using Google's tools.

Write your content in a single Google Doc, keep your contacts in a Google
Sheet, send personalized emails via Gmail, and provide a "View in browser" web
page (with an archive of past editions). Also supports deploying the web site
to Netlify.

---

## Workflow

- See "Initial setup (non-technical users)" section for initial setup

- In the **Doc**: add a new **Heading 1** with your edition title, then write
  content/images below it.

- In the **Sheet**, Fill **A** = Name, **B** = Email.

- If you wish to skip a contact, add _No_ in the **C** column.

- If you are using Netlify, deploy the site using **Inkling → Deploy site to
  Netlify**. 
  
  **NOTE**: You may want to run this before sending any emails out, to make
  sure there are no broken links sent out!

- Test with **Inkling → Send test to me**.

- Send with **Inkling → Send to ALL CONTACTS!**.

- Delivery status is written to **column D**.

---

## Initial Setup

This section is for writers who just want to use Inkling without installing
`clasp` or using git.

### Create a Google Doc

- The document will contain the content for the articles of the newsletter.
- Each edition starts with a new **Heading 1**.
- You can add a footer to be included in all the emails and the web pages, by
  adding a **Heading 2** with the text **Footer**, before the first **Heading
  1** entry.
- You can add an intro to be included after the "Hello <name>" greeting in the
  email by adding a **Heading 2** with the text **Intro**, before the first
  **Heading 1** entry.
- You can start by creating a copy of this [sample document], if you like. (A
  deployment of this sample document is available [here])

[sample document]: https://docs.google.com/document/d/1kgCmkiNCAKmBgc7aK2e_M-AGWNf3nzOUMFt62Tnd6wg/edit?usp=sharing

[here]: https://inkling-demo.netlify.app

### Create a Google Sheet

The Sheet will hold:
- Names (Column **A**)
- Emails (Column **B**)
- Send? [Y/n] (Column **C**). Sends if empty. Explicitly set to N/n/No/no for
  skipping an email.
- Email sending status (Column **D**)
- Script messages (cell **E4**)
- You can start by copying this [sample spreadsheet], if you like

[sample spreadsheet]: https://docs.google.com/spreadsheets/d/1PSPL_fuiFrTXmgqjQZH36B0WnC-UnNKPQBIBXS8oJ_c/edit?gid=0#gid=0

### Attach a script to the Sheet

1. In the Sheet: **Extensions → Apps Script**.

2. In the editor that opens, delete any starter code.

3. Copy-paste all the code from the [`src/`](src/) folder of this repo into the
   editor. You can copy each of the files with the same names into the editor.
   If you are comfortable using `git` and command line tools, you can see the
   "Development setup" section below to avoid the manual copying.

4. Save.

### Install the trigger (for menus)

The **Inkling** menu should appear after reload (with a small delay). If it
doesn’t:

- Go to **Triggers → Add Trigger**

- Function = `onOpen` • Event source = *From spreadsheet* • Event type = *On open*

### Deploy the website to App Script (for “View in browser”)

- If you'd like to deploy to Netlify see the section below

- In the editor: **Deploy → New deployment → Web app**

  - **Execute as:** *Me (User deploying)*

  - **Who has access:** *Anyone* (any Google account) or *Anyone anonymous* (public)

- Copy the **/exec** URL — this will be used in the “View in browser” banner
  and archive page.

> Note: Apps Script Web Apps show a blue Google banner — expected. We add
> `<base href="…/exec/" target="_top">` to avoid iframe/preview quirks.

### Deploy the website to Netlify

Inkling can publish a full static site (archive + each edition as its own page)
to Netlify. Your Apps Script builds the site and pushes it via Netlify's Deploy
API to Netlify.

- Create a Netlify account
- Create a Netlify site (empty is fine)
- Add your Netlify Site ID as a Script property
  - Netlify UI → Site settings → General → Site details → API ID (copy this value).
  - In the Google Sheet open Extensions → Apps Script → Project Settings → Script
    Properties, and `NETLIFY_SITE_ID`.
- Create a Personal Access Token
  - Netlify UI → User settings → Applications → Personal access tokens → New token.
  - Add the token as `NETLIFY_TOKEN` in your Script properties
- Add your netlify site URL as `NETLIFY_URL` script property (e.g. https://inkling-demo.netlify.app)

### Script Properties

In the editor: **Project Settings → Script Properties**

- `DOC_ID` → the Google Doc ID that contains your newsletter content (one Doc,
  many editions; each edition starts with an **H1**).

- *(Optional)* `WEBAPP_BASE_URL` → your deployed `/exec` Web App URL (stable
  link used in emails).

---

## Development Setup (optional)

This section is for those who want to track the project in git and use `clasp`
to push/pull changes to Apps Script.

### Install clasp

```bash
npm install -g @google/clasp
clasp login
```

> You may need to enable the **Apps Script API** for your Google account:
> https://script.google.com/home/usersettings

### Clone this repo

```bash
git clone https://github.com/punchagan/inkling.git
cd inkling
```

All the source code is in `src/`.

### Attach the script to your Sheet

1. In the Sheet: **Extensions → Apps Script**.

2. In the script editor: copy the **Script ID** (from **Project Settings →
   Script ID**).

3. In your local repo, run:

   ```bash
   clasp clone <SCRIPT_ID> --rootDir src
   ```

   This creates a local `.clasp.json` (ignored by git) pointing to your project.

### Push the code

```bash
clasp push
```

This uploads everything from `src/` into your bound Apps Script project. Reload
the Sheet: you should now see the **Inkling** menu at the top.

## Notes

- Gmail send **limits apply** (approx. 500/day personal, ~2,000/day Workspace;
  check your account policies).

- `.clasp.json` is **not committed** — each user/contributor has their own
  version of it (created via `clasp clone` or `clasp create`).
