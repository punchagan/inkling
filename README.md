# Inkling

Inkling is a tiny toolkit to write, send and (web) publish a personal
newsletter using only Google tools.

Write your content in a single Google Doc, keep your contacts in a Google
Sheet, send personalized emails via Gmail, and provide a "View in browser" web
page (with an archive of past editions). Also supports deploying the web site
to Netlify.

---

## How it works

Once Inkling is set up, this is your simple, day-to-day process for publishing an edition.

| Step    | Action                            | Description                                                                                                                                                                    |
|---------|-----------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Write   | Go to your Google Doc.            | Add a new **Heading 1** with your edition title, then write your content and add images below it.                                                                              |
| Review  | Inkling → Send test to me.        | Always run a test **send to yourself first** to make sure everything looks right!                                                                                              |
| Publish | Inkling → Deploy site to Netlify. | (If you are using Netlify) Run this **before** sending the emails to update your public web-site, to make sure web links in the email work correctly.                          |
| Send    | Inkling → Send to ALL CONTACTS!   | This sends a personalized email to everyone on your Google Sheet. **IMPORTANT:** Gmail send limits apply (typically ~500/day for personal accounts, ~2,000/day for Workspace). |

---

## Initial Setup

This is a **one-time process** to connect your Google files and install the
Inkling code. Follow these steps, and you'll be ready to write!

### A. Create Your Inkling Files

You need two files to start: one for your writing, and one for your contacts.

1. Create Your Content Doc (for Writing):

   - This document holds all your newsletter content.
   - Each edition starts with a **Heading 1**.
   - You can start by creating a copy of this [sample document].

[sample document]: https://docs.google.com/document/d/1kgCmkiNCAKmBgc7aK2e_M-AGWNf3nzOUMFt62Tnd6wg/edit?usp=sharing

2. Create Your Contacts Sheet (For Emails):

    - This spreadsheet holds your contact list.
    - Fill **Column A** = Name, and **Column B** = Email.
    - You can start by copying this [sample spreadsheet].

[sample spreadsheet]: https://docs.google.com/spreadsheets/d/1PSPL_fuiFrTXmgqjQZH36B0WnC-UnNKPQBIBXS8oJ_c/edit?gid=0#gid=0


### B. Add the Inkling Code

The code lives inside your Google Sheet using Google Apps Script.

1. In your **Google Sheet**: Go to **Extensions → Apps Script**.

2. In the editor that opens, **delete any starter code** you see.

3. Copy-paste all the code from the [`src/`](src/) folder of this repo into the
   editor. You can copy each of the files with the same names into the editor.

4. Click the **Save** icon.

If you are comfortable using `git` and command line tools, see the [Development
setup](#development-setup-optional) section below to avoid the manual copying.

### C. Make the 'Inkling' Menu Appear

You should see the **Inkling** menu in the **Google Sheet** automatically, in a
few seconds, after reloading it. If it doesn’t, show up, you may need to manually set it up:

1. In the Apps Script editor, open the **Triggers** (clock icon on the left).

2. Click **Add Trigger** (bottom right).

3. Set the three dropdowns to: `onOpen` •  `From spreadsheet` • `On open` 

### D. Connect Your Doc and Sheet

You need to tell the script where your content is located.


1. In the Apps Script editor, go to **Project Settings** (gear icon on the
   left) → **Script Properties**.

2. Click **Add Script Property**.

3. Add the property `DOC_ID`.

4. The value is the long string of letters/numbers in your Google Doc's URL
   (e.g., the part between `/d/` and `/edit`).

### E. Create Your "View in Browser" Link

This creates a public, stable link for your Newsletter editions

1. In the Apps Script editor: Click **Deploy → New deployment → Web app**

2. Set **Execute as:** *Me (User deploying)*

3. Set **Who has access:** *Anyone* (any Google account) or *Anyone anonymous* (public).

4. Deploy. Copy the resulting `/exec` URL.

5. Go back to **Project Settings → Script Properties** and add a new property:
   `WEBAPP_BASE_URL` with the copied `/exec` URL as its value.
   
## Bonus Features

These steps are **optional** and intended for users who want to add extra flair
(like a custom footer) or who want to publish a public archive website using
Netlify.

### Optional Content Customization (Intro and Footer)

You can add two special sections to your Google Doc that appear in every email
and webpage. Place them **before the first Heading 1** edition title:

- **Intro**: Add a **Heading 2** with the text `Intro`. Content below this will
  be included after the "Hello <name>" greeting in the email.

- **Footer**: Add a **Heading 2** with the text `Footer`. Content below this
  will be included at the bottom of all emails and web pages.

### Deploy the website to Netlify

Inkling can publish a full, static website (an archive + each edition with its
own page) to Netlify using the **Inkling → Deploy site to Netlify** menu item.

1. Create a [Netlify account](https://app.netlify.com/signup)

2. Create a new Netlify site (empty is okay — Inkling will populate it!)

3. **Add Script Properties**: In your Google Apps Script Properties, add the following three properties to connect Netlify:
  - `NETLIFY_SITE_ID`: Found in `Netlify UI → Site settings → General → Site
    details → API ID` .
  - `NETLIFY TOKEN`: A Personal Access Token you create in `Netlify UI → User
    settings → Applications → Personal access tokens`.
  - `NETLIFY_URL`: Your public Netlify site URL (e.g. https://inkling-demo.netlify.app)

---

### Development Setup (optional)

This section is for those who want to track the project in `git` and use
`clasp` to push/pull changes to Apps Script.

#### Install clasp

```bash
npm install -g @google/clasp
clasp login
```

> You may need to enable the **Apps Script API** for your Google account:
> https://script.google.com/home/usersettings

#### Clone this repo

```bash
git clone https://github.com/punchagan/inkling.git
cd inkling
```

All the source code is in `src/`.

#### Attach the script to your Sheet

1. In the Sheet: **Extensions → Apps Script**.

2. In the script editor: copy the **Script ID** (from **Project Settings →
   Script ID**).

3. In your local repo, run:

   ```bash
   clasp clone <SCRIPT_ID> --rootDir src
   ```

   This creates a local `.clasp.json` (ignored by git) pointing to your project.

#### Push the code

```bash
clasp push
```

This uploads everything from `src/` into your bound Apps Script project. Reload
the Sheet: you should now see the **Inkling** menu at the top.

---

## AI Transparency

This project was developed with significant AI assistance (ChatGPT by Open AI).
The core architecture and design grew out of some hackish script I had put
together in the past, but extensive refactoring, feature additions, etc., were
performed using AI-assisted development.

While the tool has been tested and works well in practice, users should be aware that:

- **Technical implications**: AI-generated code may have unique patterns or
  subtle issues. We've tested Inkling on real newsletters, but thorough testing
  is always recommended.

- **Legal uncertainty**: The copyright status and liability for AI-generated
  code remain legally untested. The original codebase provides a foundation,
  but AI contributions cannot be easily traced to specific training data.

- **Practical use**: Despite these unknowns, Inkling provides useful
  functionality for managing a tiny personal newsletter+site and is actively
  maintained.

By using this tool, you acknowledge these uncertainties. As with any
development tool: use version control, review generated newsletters+site, and
test thoroughly.
