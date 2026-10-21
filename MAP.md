# AngleOS code map

A reference for where everything lives. Updated whenever files are added. The planning notes are in `../planning/`.

## Top level
| File or folder | What it is |
|---|---|
| `README.md` | How to use and run this, written for a non-developer |
| `MAP.md` | This file |
| `package.json`, `package-lock.json` | The list of open-source packages the app uses (npm) |
| `next.config.ts`, `tsconfig.json`, `postcss.config.mjs` | App settings (Next.js, TypeScript, Tailwind) |
| `render.yaml` | Describes the hosting service on Render |
| `.env.example` | Names of the secret settings. The real `.env` is never stored here |
| `.gitignore` | Files that never go to GitHub (secrets, build output, `node_modules`) |
| `db/migrations/` | The database tables, as numbered SQL files. Applied automatically when the app starts |
| `tests/` | Automatic checks (`npm test`) |
| `public/` | Static files served as they are |
| `src/` | The app itself (below) |
| `prompts/` | Not used: prompts live in the private database (this repo is public) |

## `src/app/` (the screens)
| Path | Screen |
|---|---|
| `(auth)/login`, `(auth)/register` | Sign in, and invite-only registration |
| `(auth)/forgot-password`, `(auth)/reset-password` | Forgot password: an admin makes a one-hour code, the person sets a new password with it |
| `(auth)/actions.ts` | The server code behind login, register and sign out |
| `(app)/layout.tsx` | Wraps every signed-in screen (sidebar, top bar, AI chat) |
| `(app)/page.tsx` | Dashboard |
| `(app)/projects`, `projects/new`, `projects/[id]`, `projects/[id]/files/[fileId]` | Projects list, new project, project detail (tabs: brief, files, context, and later angles/scripts/analyses/swipe), plain-text file preview. `projects/actions.ts` holds create, upload, delete and save-context actions |
| `(app)/angles` | Angle Generator |
| `(app)/scripts` | Script Writer with the multi-select format picker |
| `(app)/studio`, `studio/[style]` | Animated Ad Studio and its seven styles |
| `(app)/static` | Static Ad Builder |
| `(app)/analyze` | Analyze Ad |
| `(app)/swipe` | Swipe File |
| `(app)/gethooked` | Get Hooked search |
| `(app)/team` | Everyone: who is online right now and who is on the team (names only) |
| `(app)/settings` | Settings: change name (once per 30 days), change password, your AI usage (working); account context and connections are still samples |
| `(app)/admin/knowledge-base` | Admin only: import playbook and lessons, test the brain, stats. Sub-pages: `modules/[code]` (read, switch off, edit rules), `lessons` and `lessons/[id]` (cleaned lessons) |
| `(app)/admin/prompts`, `prompts/[key]` | Admin only: import the Evolve prompts, edit with a reason, full history, restore the original |
| `(app)/admin/invites` | Admin only: create and revoke invite codes (fully working) |
| `(app)/admin/users` | Admin only: everyone with an account, who is online, promote or demote, switch off, set each person's AI limit (fully working) |
| `api/presence` | The "I'm online" ping the open app sends every minute |
| `api/health` | A "is it alive" check used by Render |
| `globals.css` | The look: colours, dark and light themes |

## `src/lib/` (behind the scenes)
| File | What it does |
|---|---|
| `db.ts` | The one door to the database |
| `migrate.ts`, `../instrumentation.ts` | Create or update the tables when the app starts |
| `auth.ts` | Sessions (who is signed in) |
| `password.ts` | Password hashing |
| `invite-code.ts` | Making and checking invite codes |
| `rate-limit.ts` | Slows down password guessing |
| `usage-limit.ts`, `usage.ts` | The A$10 AI limit rule (members A$10 in total, admins unlimited). Every AI feature checks this first |
| `nav.ts` | The sidebar menu |
| `placeholder.ts` | SAMPLE data used by screens that are not built yet |
| `kb/parse-playbook.ts` | Reads a playbook .md file into a module and numbered rules |
| `kb/clean-lesson.ts` | Cleans transcripts, flags garbled ones, splits into passages |
| `kb/prompt-blanks.ts` | Finds the blanks in a prompt |
| `kb/store.ts` | Saves imports to the database and does the keyword search |

## `src/components/`
Reusable pieces: `app-shell.tsx` (sidebar and top bar), `chat-panel.tsx`, `auth-form.tsx`, `script-writer.tsx`, `static-builder.tsx`, `analyze-ad.tsx`, `project-forms.tsx` (new project, context, file uploader), `invite-form.tsx`, `theme-toggle.tsx`, `logo.tsx`, `page.tsx` (page headers, empty and loading states), and `ui/` (buttons, inputs, cards).

## Status by phase
| Phase | Status |
|---|---|
| 0 Skeleton, login, invites, database, deploy | Built |
| 0b App shell with sample data | Built, waiting for Ayaan's sign-off |
| 1 Knowledge base | Built (keyword search; meaning search comes with the OpenAI key) |
| 2 Projects | Not started (screens are samples) |
| 3 Angle Generator | Not started |
| 4 Script Writer | Not started |
| 5 Swipe File and Analyze Ad | Not started |
| 5b Animated Ad Studio and Static Ads | Not started |
| 6 Get Hooked | Not started |


## Uploads and projects (Phase 2A)

- `src/lib/uploads/limits.ts`: every size, count and speed limit in one place.
- `src/lib/uploads/extract.ts`: safe reading of zips (streamed, stops on real bytes), PDF, DOCX, text. Pure, tested.
- `src/lib/uploads/ingest.ts`: checks, dedupes, enforces quotas and saves only the text.
- `src/lib/projects.ts`, `src/lib/markets.ts`: project lookup with owner check, market list.
- `db/migrations/005_projects.sql`: projects, project_files, project_context.

## AI brief (Phase 2B)

- `src/lib/ai/gemini.ts`: the only code that talks to Google (key from GEMINI_API_KEY, sent in a header; models come from settings). Has a fake AI used only by the in-memory test database.
- `src/lib/ai/settings.ts`: AI settings (models, prices, caps, kill switch) stored in `ai_settings`.
- `src/lib/ai/guard.ts`: every safety check: per-person credit, daily app-wide cap, one run at a time, runs-per-15-minutes limit, per-run cap, usage logging.
- `src/lib/ai/cost.ts`: pure cost and batching maths (tested).
- `src/lib/ai/brief.ts`: plan and estimate, the reader step (cached per file), the writer step, edit-preserving save.
- `(app)/admin/ai`: admin page for models, prices, limits, test button, 24-hour spend.
- `(app)/projects/brief-actions.ts`, `components/brief-panel.tsx`: Build brief button with cost confirm, progress, edit sections.
- `db/migrations/006_ai_brief.sql`: ai_settings, ai_jobs, project_briefs, file summary columns.
