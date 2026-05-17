# NorCal N Club — Website

Static front-end + serverless API + admin UI for [NorCal N Club](https://www.instagram.com/norcal_n_club/).

- **Hosting:** Cloudflare Pages (private GitHub repo)
- **Backend:** Cloudflare Pages Functions (no separate Worker, no CORS)
- **Database:** Cloudflare D1 (SQLite)
- **Image storage:** Cloudflare R2
- **Admin auth:** Cloudflare Access (One-Time PIN via email — no GitHub account needed)
- **All free tier**, no monthly cost.

## Project structure

```
.
├── index.html                  Landing page (Hero + About + Events + Garage + Join)
├── members.html                Public Garage (drivers + their builds)
├── event.html                  Public single-event page with RSVP form (?slug=…)
├── styles.css                  Shared design system
├── main.js                     Shared front-end (nav, scroll, events fetch, Join form)
├── members.js                  Garage page logic (fetch + shuffle)
├── event.js                    Event detail page logic (fetch + RSVP submit)
├── assets/                     favicon, og-image
│
├── functions/                  ← Cloudflare Pages Functions (the API)
│   ├── _shared/
│   │   ├── responses.js        json/ok/bad/notFound/conflict/serverErr helpers
│   │   ├── ulid.js             ULID + slugify
│   │   ├── events.js           DB row → public/admin event shape
│   │   └── access.js           CF Access JWT verification (RS256 + JWKS)
│   └── api/
│       ├── events.js           GET list (public)
│       ├── events/[id].js      GET one (public, by id or slug)
│       ├── events/[id]/rsvp.js POST RSVP, capacity-checked atomically
│       ├── members.js          GET public profiles · POST Join form
│       └── admin/
│           ├── _middleware.js  JWT validation gate for everything below
│           ├── events.js       GET all · POST create
│           ├── events/[id].js  GET · PATCH · DELETE
│           ├── upload.js       POST multipart → R2 → return key+url
│           ├── rsvps.js        GET (?event_id, ?format=csv)
│           ├── signups.js      GET (?format=csv)
│           ├── members.js      GET all · POST create
│           └── members/[id].js GET · PATCH · DELETE
│
├── admin/                      ← protected by Cloudflare Access at the edge
│   ├── index.html              Dashboard tiles
│   ├── events.html             Events list + delete
│   ├── event-edit.html         Create/edit event + image upload
│   ├── rsvps.html              All RSVPs grouped by event + CSV export
│   ├── signups.html            Join requests + CSV export
│   ├── members.html            Garage profile CRUD
│   ├── admin.css               Admin-only overrides (same palette)
│   └── admin.js                Shared fetch helper + utils
│
├── schema.sql                  D1 schema (run once)
├── seed.sql                    Initial 4 events + 4 members
└── wrangler.toml               D1/R2 bindings + env vars
```

## First-time setup

You only do this once.

### 1. Cloudflare Pages — connect the repo

1. https://dash.cloudflare.com → **Workers & Pages** → **Create** → **Pages** tab → **Connect to Git**.
2. Authorize Cloudflare's GitHub app for the `NorcalNclub` repo only.
3. Project settings:
   - **Production branch:** `main`
   - **Framework preset:** None
   - **Build command:** *(empty)*
   - **Build output directory:** *(empty / `/`)*
4. Deploy. You'll get a `*.pages.dev` URL.

### 2. Custom domain on Cloudflare Pages

1. Pages project → **Custom domains** → **Set up a custom domain** → `norcalnclub.com`. Save.
2. Repeat for `www.norcalnclub.com`.
3. Cloudflare auto-creates the DNS records and provisions HTTPS for both.
4. **Once it's live: in the GitHub repo → Settings → Pages → Unpublish** (otherwise GH Pages and CF Pages fight over the domain).
5. Then **Settings → General → Change visibility → Private**.

### 3. Create D1 + R2 from your dev machine

You need [Wrangler](https://developers.cloudflare.com/workers/wrangler/) installed: `npm install -g wrangler`.

```bash
wrangler login
wrangler d1 create nclub-db
#   → copy the printed `database_id` into wrangler.toml under [[d1_databases]]
wrangler r2 bucket create nclub-uploads

# Apply schema + initial data:
wrangler d1 execute nclub-db --remote --file=schema.sql
wrangler d1 execute nclub-db --remote --file=seed.sql

# Make R2 bucket publicly readable (so <img src="..."> works):
#   Cloudflare dash → R2 → nclub-uploads → Settings → Public Access → enable.
#   Copy the resulting "Public R2.dev Bucket URL" (looks like https://pub-xxxx.r2.dev)
#   and paste it into wrangler.toml under [vars].R2_PUBLIC_URL.
```

Bind D1 + R2 to the Pages project:

- Pages project → **Settings → Functions → D1 database bindings**
  - Variable name `DB`, database `nclub-db`.
- Pages project → **Settings → Functions → R2 bucket bindings**
  - Variable name `UPLOADS`, bucket `nclub-uploads`.

These bindings are what `env.DB` and `env.UPLOADS` resolve to inside the functions.
(`wrangler.toml` is the source of truth for local dev; the dashboard bindings are what CF Pages uses in production.)

### 4. Cloudflare Access for `/admin`

1. https://one.dash.cloudflare.com → Access → **Applications** → **Add an application** → **Self-hosted**.
2. **Application configuration:**
   - **Name:** NorCal N Club Admin
   - **Session duration:** 24 hours (or whatever feels right)
   - **Application domain:** `norcalnclub.com`, paths: add **two** entries — `admin` and `api/admin`. (Both need protection.)
3. **Add a policy:**
   - **Policy name:** Admins
   - **Action:** Allow
   - **Selector:** Emails → list the admin email(s).
4. **Identity provider:** Use the default **One-time PIN** (no extra setup). Visitors enter their email, get a 6-digit code, type it in.
5. After saving, click the application → **Overview** tab → copy the **Application Audience (AUD) Tag** and your **Team domain** (e.g. `nclub.cloudflareaccess.com`).
6. Pages project → **Settings → Environment variables → Production**:
   - `ACCESS_AUD` = the AUD tag
   - `ACCESS_TEAM_DOMAIN` = e.g. `nclub.cloudflareaccess.com` (no `https://`)
   - `R2_PUBLIC_URL` = e.g. `https://pub-xxxxxxxxxxxxxxxx.r2.dev`
7. Trigger a redeploy (Pages → Deployments → Retry).

Done. Visit `https://norcalnclub.com/admin/` — you'll see the CF Access challenge, enter your email, type the code, you're in.

## Day-to-day

### For the admin (non-technical)

Just go to `https://norcalnclub.com/admin/` and log in with your email. From there:

- **Events** → list, edit, delete. Click **+ New event** to create one. The event editor includes:
  - Title, category, date/time, location, description
  - Capacity (blank = unlimited)
  - Toggle "Show RSVP form on event page"
  - Toggle "Featured" to highlight on the home page
  - Cover image upload (JPG/PNG/WEBP, ≤ 8MB)
- **RSVPs** → see who signed up for each event, export CSV per event or all together
- **Join** → see Join-form submissions, export CSV
- **Members** → manage the Garage profiles (drivers' cars shown on `/members.html`)

Changes appear on the public site within seconds — no rebuild needed (the site fetches live from the API).

### For the developer

```bash
# Local dev (preview Pages Functions + bindings)
wrangler pages dev . --d1=DB=nclub-db --r2=UPLOADS=nclub-uploads
# Open http://localhost:8788

# Migrate schema after editing schema.sql
wrangler d1 execute nclub-db --remote --file=schema.sql

# Inspect data
wrangler d1 execute nclub-db --remote --command="SELECT id, title, rsvp_count, capacity FROM events ORDER BY starts_at"

# Deploy = push to main. CF Pages auto-builds.
git push origin main
```

## API

| Method | Path                              | Auth   | Purpose                     |
|--------|-----------------------------------|--------|-----------------------------|
| GET    | `/api/events`                     | public | upcoming published events   |
| GET    | `/api/events/:id`                 | public | one event by id or slug     |
| POST   | `/api/events/:id/rsvp`            | public | RSVP (capacity-checked)     |
| GET    | `/api/members`                    | public | Garage profiles             |
| POST   | `/api/members`                    | public | Join form submission        |
| GET    | `/api/admin/events`               | admin  | all events (any status)     |
| POST   | `/api/admin/events`               | admin  | create event                |
| GET/PATCH/DELETE | `/api/admin/events/:id` | admin  | edit / delete               |
| POST   | `/api/admin/upload`               | admin  | image → R2                  |
| GET    | `/api/admin/rsvps?event_id&format`| admin  | list / CSV                  |
| GET    | `/api/admin/signups?format`       | admin  | join form list / CSV        |
| GET/POST | `/api/admin/members`            | admin  | Garage profile CRUD         |
| GET/PATCH/DELETE | `/api/admin/members/:id`| admin  | edit / delete               |

## Notes

- Not affiliated with Hyundai Motor Company.
- The `/members/*.json` files are no longer used after Phase 1 — the Garage now reads from D1 via `/api/members`. Safe to delete the directory once you've verified the site looks right after first deploy.
- The `CNAME` and `.nojekyll` files are GitHub Pages artifacts. CF Pages ignores them; safe to delete once GH Pages is unpublished.
- All animations honor `prefers-reduced-motion`.
