# NorCal N Club — Setup Checklist

A linear, copy-paste-friendly walkthrough for migrating from GitHub Pages to the new Cloudflare stack (CF Pages + D1 + R2 + Access). Do these in order. Roughly 45 min end-to-end if nothing fights you.

> **Where to keep this file open:** in another tab — you'll be flipping between Cloudflare dashboard, GitHub, and your terminal.

---

## Step 0 — One-time prerequisites

- A Cloudflare account (you already have one — `norcalnclub.com` is on it).
- The `wrangler` CLI installed locally:
  ```bash
  npm install -g wrangler
  wrangler --version    # should print 3.x or higher
  ```
- You're signed in on GitHub as `Varshithsaipeddi`.

---

## Step 1 — Stand up Cloudflare Pages (no functional change yet)

1. Go to https://dash.cloudflare.com → **Workers & Pages** → **Create** → **Pages** tab → **Connect to Git**.
2. **Install the Cloudflare GitHub app**, granting access to **only the `NorcalNclub` repo**.
3. Pick the repo. Build settings:
   - **Production branch:** `main`
   - **Framework preset:** *None*
   - **Build command:** *(leave empty)*
   - **Build output directory:** *(empty / `/`)*
4. Click **Save and Deploy**. First build finishes in ~30 sec.
5. Visit the `*.pages.dev` URL it gives you — the static site should render. Members page works, events grid will say "couldn't load meets" (that's the API hitting nothing yet — expected).

✅ Checkpoint: site renders at `*.pages.dev`.

---

## Step 2 — Attach `norcalnclub.com` to the Pages project

1. Pages project → **Custom domains** → **Set up a custom domain** → enter `norcalnclub.com` → Continue.
2. Cloudflare prompts to update DNS. Accept (it overwrites the records — that's fine, GH Pages records get replaced).
3. Repeat for `www.norcalnclub.com`.
4. Wait ~2-5 min. Both should show **Active** with a green check.

✅ Checkpoint: `https://norcalnclub.com` loads via Cloudflare Pages (DevTools Network tab → response header `cf-ray` present).

---

## Step 3 — Disable GitHub Pages and flip the repo to private

> Don't do this until Step 2 is green, or the site goes dark.

1. **GitHub repo → Settings → Pages** → click **Unpublish site** (under the live URL).
2. **GitHub repo → Settings → General** → scroll to **Danger Zone** → **Change repository visibility** → **Make private**. Confirm.

✅ Checkpoint: `gh repo view Varshithsaipeddi/NorcalNclub --json visibility` returns `"private"`. Site still loads at `norcalnclub.com`.

---

## Step 4 — Create the database + storage bucket

```bash
cd ~/nclub                                # or wherever the repo lives
wrangler login                            # one-time, opens browser

wrangler d1 create nclub-db
# 👀 Copy the printed database_id into wrangler.toml (line with database_id = "")

wrangler r2 bucket create nclub-uploads
```

Then apply the schema and seed:
```bash
wrangler d1 execute nclub-db --remote --file=schema.sql
wrangler d1 execute nclub-db --remote --file=seed.sql
```

Sanity check:
```bash
wrangler d1 execute nclub-db --remote \
  --command="SELECT id, title, starts_at FROM events ORDER BY starts_at"
```
You should see the 4 seeded events.

✅ Checkpoint: `nclub-db` exists with 4 events + 4 members; `nclub-uploads` bucket exists.

---

## Step 5 — Make R2 publicly readable + grab the URL

1. CF dash → **R2** → click **nclub-uploads** → **Settings** tab → **Public Access** section → **Allow Access**.
2. Cloudflare displays a **Public R2.dev Bucket URL** like `https://pub-xxxxxxxxxxxxxxxx.r2.dev`. **Copy it.**
3. Open `wrangler.toml` and paste it as the value of `R2_PUBLIC_URL` under `[vars]`.

✅ Checkpoint: `R2_PUBLIC_URL` set in `wrangler.toml` (and you'll set it again in the Pages env in Step 7).

---

## Step 6 — Bind D1 + R2 to the Pages project

1. Pages project → **Settings → Functions** → scroll to **D1 database bindings**.
2. **Add binding:**
   - **Variable name:** `DB`
   - **D1 database:** `nclub-db`
3. Scroll to **R2 bucket bindings**. **Add binding:**
   - **Variable name:** `UPLOADS`
   - **R2 bucket:** `nclub-uploads`
4. Save.

✅ Checkpoint: Both bindings show up in the Functions settings table.

---

## Step 7 — Set up Cloudflare Access (admin login)

1. https://one.dash.cloudflare.com → **Access → Applications → Add an application → Self-hosted**.
2. **Application configuration:**
   - **Application name:** `NorCal N Club Admin`
   - **Session duration:** `24 hours`
   - **Application domain:**
     - Domain: `norcalnclub.com`, Path: `admin`
     - Click **+ Add Application Domain**
     - Domain: `norcalnclub.com`, Path: `api/admin`
3. Click **Next**.
4. **Add a policy:**
   - **Policy name:** `Admins`
   - **Action:** `Allow`
   - **Configure rules:** Selector = **Emails**, Value = `<your admin email>` (add multiple if needed).
   - Click **Next**.
5. **Setup → Identity providers:** keep **One-time PIN** checked. Click **Next → Add application**.
6. After creation, click the application again → **Overview** tab. Copy these two values:
   - **Application Audience (AUD) Tag** → looks like a 64-char hex string
   - **Team domain** → looks like `<something>.cloudflareaccess.com`

✅ Checkpoint: You've got both values copied somewhere safe.

---

## Step 8 — Set environment variables on Pages

1. Pages project → **Settings → Environment variables** → **Production**.
2. Add three plaintext variables:
   - `ACCESS_AUD` = the AUD tag from Step 7
   - `ACCESS_TEAM_DOMAIN` = e.g. `nclub.cloudflareaccess.com` (no `https://`, no trailing slash)
   - `R2_PUBLIC_URL` = e.g. `https://pub-xxxxxxxxxxxxxxxx.r2.dev` (the one from Step 5)
3. Save.
4. Trigger a redeploy: **Deployments → ... → Retry deployment** on the most recent build.

✅ Checkpoint: Latest deployment is **Success** with the new env vars.

---

## Step 9 — Push the new code

```bash
git add -A
git commit -m "CF Pages + D1/R2 backend + admin UI"
git push origin main
```

CF Pages auto-builds in ~30 sec.

---

## Step 10 — Verify everything works

In a private browser window:

- `https://norcalnclub.com/` → home page renders, **Events section now shows the 4 seeded meets** (no longer hardcoded — they came from the API)
- `https://norcalnclub.com/members.html` → 4 driver cards, shuffle works
- `https://norcalnclub.com/event.html?slug=skyline-hwy9-2026-06` → event detail with RSVP form
- Submit a test RSVP → should say "You're in"
- `https://norcalnclub.com/admin/` → CF Access prompt → enter your email → 6-digit code arrives in your inbox → enter it → admin dashboard
- Click **Events** → see the 4 events; click **+ New event** → fill it out, upload an image → save → check it appears on the public site
- Click **RSVPs** → see the test RSVP you just submitted

If any of these fail, scroll down to **Troubleshooting**.

---

## Day-to-day, after this is set up

**Adding events / members:** `https://norcalnclub.com/admin/` — log in with your email, click around. Changes go live immediately.

**Database changes:** edit `schema.sql`, then:
```bash
wrangler d1 execute nclub-db --remote --file=schema.sql
```

**Code changes:** edit, `git push`. CF Pages redeploys automatically.

**Local dev:**
```bash
wrangler pages dev . --d1=DB=nclub-db --r2=UPLOADS=nclub-uploads
# → http://localhost:8788
```

**Inspecting data:**
```bash
wrangler d1 execute nclub-db --remote \
  --command="SELECT * FROM rsvps ORDER BY created_at DESC LIMIT 20"
```

---

## Troubleshooting

### "couldn't load meets" on home page after Step 10
- DB binding missing or wrong name. Confirm Step 6: variable name must be exactly `DB`.
- D1 not seeded. Re-run `wrangler d1 execute nclub-db --remote --file=seed.sql`.
- Check the Function logs: Pages project → **Functions** tab → **Real-time logs**.

### `/admin` doesn't show the email prompt — it just loads
- CF Access app paths are wrong. Step 7.2: the paths must be `admin` AND `api/admin`, both on `norcalnclub.com`.

### `/admin` shows the prompt but admin pages then say "Unauthorized"
- `ACCESS_AUD` or `ACCESS_TEAM_DOMAIN` env var is wrong/missing. Re-check Step 8 and re-deploy.
- AUD must match exactly — copy-paste, no spaces.

### Image upload says "R2 binding UPLOADS missing"
- R2 binding not set in Pages settings. Re-do Step 6.

### Image uploads succeed but images don't show
- `R2_PUBLIC_URL` env var missing or bucket not made public. Step 5 + Step 8.

### `wrangler login` opens a browser but never finishes
- Try `wrangler login --browser=false` and follow the device-code flow in your terminal.

### Site went dark right after Step 3
- DNS hasn't propagated yet. Wait 5 min. If still dark: Pages project → **Custom domains** → re-attach `norcalnclub.com`.

---

## Reverting (escape hatch)

Everything except the repo-private flip is reversible in <2 minutes:
1. Pages → Custom domains → remove `norcalnclub.com` from CF Pages
2. GitHub → Settings → Pages → re-enable, re-add custom domain
3. Cloudflare DNS → restore the GitHub A records (`185.199.108-111.153`)

The data stays in D1 either way.
