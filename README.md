# AngleOS (code)

The app itself. You do **not** need to install or run anything on your computer: the app lives on Render and you open it in your browser. This folder holds the source files. See `MAP.md` for what each file does.

## Using it
1. Open the AngleOS website (the Render address Claude gave you) in any browser, including your phone.
2. Sign in. The very first account (yours) is created with the one-time setup code, then that code stops working.
3. To let someone in: sign in, click **Invites** in the left menu (under Admin), click **Create code**, copy the code and send it to them. They open the same website, click **Create your account**, and enter the code. Each code works once.
4. To change anything in the app, ask Claude. It edits these files, tests them and pushes them to GitHub, and Render updates the website by itself.

## Settings the app needs (called environment variables)
These are stored on Render, never in this folder. `.env.example` lists the names only.

| Name | What it is |
|---|---|
| `DATABASE_URL` | Address and password of the Neon database |
| `ADMIN_EMAIL` | The email allowed to create the very first (admin) account |
| `SETUP_CODE` | One-time code for creating that first account. Does nothing once any account exists |

API keys for OpenAI, Gemini and Get Hooked are added in later phases, when those features are built. Never paste a key into chat or into a file in this folder. Claude will tell you exactly where to put each one.

## For developers (only if you ever need it)
```
npm install
cp .env.example .env     # fill it in. For a throwaway local database use DATABASE_URL=pglite:memory
npm run dev              # http://localhost:3000
npm test                 # automatic checks
npm run build && npm start
```
Do not run `npm install` inside OneDrive: it creates tens of thousands of small files that slow OneDrive down. Keep a working copy somewhere else, like `C:\dev\angleos`.

## Security notes
- Passwords are stored as salted scrypt hashes. Session cookies are httpOnly and secure. Only a hash of each session token is stored.
- Invite codes are stored as hashes. The code is shown once when created.
- Repeated wrong passwords or codes are rate limited.
- Course material and prompts will be admin-only (enforced on the server) when they are added in Phase 1.
