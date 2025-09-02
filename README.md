# Inkling

Inkling is a tiny toolkit to publish a personal newsletter using Google's tools.

Write your content in a single Google Doc, keep your contacts in a Google
Sheet, send personalized emails via Gmail, and provide a "View in browser" web
page (with an archive of past editions).

---

## Workflow

- See "Initial setup (non-technical users)" section for initial setup

- In the **Doc**: add a new **Heading 1** with your edition title, then write
  content/images below it.

- In the **Sheet**:
  - Set **D2** = that edition title (must exactly match the H1).
  - Fill **A** = Name, **B** = Email (leave **C** for status).

- Test with **Inkling → Send test to me**.

- Send with **Inkling → Send to ALL CONTACTS!**.

- Delivery status is written to **column C**.

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
- You can start by creating a copy of this [sample document], if you prefer

[sample document]: https://docs.google.com/document/d/1kgCmkiNCAKmBgc7aK2e_M-AGWNf3nzOUMFt62Tnd6wg/edit?usp=sharing

### Create a Google Sheet

The Sheet will hold:
- Names (Column **A**)
- Emails (Column **B**)
- Email sending status (Column **C**)
- Subject line (cell **D2**)
- Script messages (cell **D4**)

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

### Deploy the Web App (for “View in browser”)

- In the editor: **Deploy → New deployment → Web app**

  - **Execute as:** *Me (User deploying)*

  - **Who has access:** *Anyone* (any Google account) or *Anyone anonymous* (public)

- Copy the **/exec** URL — this will be used in the “View in browser” banner
  and archive page.

> Note: Apps Script Web Apps show a blue Google banner — expected. We add
> `<base href="…/exec/" target="_top">` to avoid iframe/preview quirks.

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

- `.clasp.json` is **not committed** — each user/contributor has their own
  version of it (created via `clasp clone` or `clasp create`).

- Gmail send limits apply (approx. 500/day personal, ~2,000/day Workspace;
  check your account policies).
