# NorCal N Club — Website

Static site for [NorCal N Club](https://www.instagram.com/norcal_n_club/), the Northern California Hyundai N community.
Pure HTML/CSS/JS — no build step. Hosted on GitHub Pages with a custom domain.

## Local preview

Any static server works. Quick option:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Deploy to GitHub Pages

1. Create a new repo on GitHub (e.g. `norcalnclub/site`).
2. Push this directory:
   ```bash
   git init -b main
   git add .
   git commit -m "Initial site"
   git remote add origin git@github.com:<owner>/<repo>.git
   git push -u origin main
   ```
3. In the repo: **Settings → Pages → Source = `main` / root**.
4. Custom domain: already configured via `CNAME` (`norcalnclub.com`).
   Add these DNS records at your domain registrar:
   - `A` records on apex `@` pointing to GitHub's IPs:
     `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - `CNAME` on `www` pointing to `<owner>.github.io`
5. Wait a few minutes, then enable **Enforce HTTPS** in Settings → Pages.

## Editing content

Everything lives in three files — open and edit:

| What | Where |
|------|-------|
| Copy, sections, events, gallery rides | `index.html` |
| Colors, fonts, animations, layout | `styles.css` |
| Counters, scroll behavior, form handler | `main.js` |

### Common edits

- **Add an event** → duplicate an `<article class="event-card">` block in the EVENTS section. Mark one with `featured` to highlight it.
- **Add a member ride** → duplicate a `<figure class="ride">` block. The `--accent` inline style sets the card's neon glow color.
- **Update stats** → change the `data-count` attributes in the hero (`.hero-stats`).
- **Discord invite** → replace `href="#"` on the link tile marked `data-edit="discord-invite"`.
- **Swap the placeholder ride graphics for real photos** → replace the `.ride-img` div with an `<img>` and update CSS:
  ```html
  <figure class="ride">
    <img src="assets/rides/elantra-n-blue.jpg" alt="Elantra N" />
    <figcaption>...</figcaption>
  </figure>
  ```

### Adding a member

The members page (`members.html`) loads one JSON file per driver from `members/` and shuffles them on every load (and when you hit **Reshuffle**).

**To add a new member:**

1. Create `members/<your-name>.json` using this template:

   ```json
   {
     "name": "Driver Name",
     "instagram": "handle_without_at",
     "city": "City, CA",
     "joined": "2024-09",
     "bio": "One or two sentences. Optional.",
     "photo": null,
     "car": {
       "model": "Elantra N",
       "year": 2024,
       "color": "Performance Blue",
       "plate": "ABC 123",
       "transmission": "DCT",
       "bhp": 286,
       "tune": "Stock",
       "mods": [
         "Mod one",
         "Mod two"
       ]
     }
   }
   ```

   - `model` should be one of: `Elantra N`, `Kona N`, `Veloster N`, `i30 N`, `i20 N` — this picks the card's accent color.
   - `photo` can be `null` (initials avatar) or a path like `"assets/members/alex.jpg"`.
   - `mods` can be an empty array `[]` for stock cars.
   - `tune` defaults to `"Stock"` if omitted.

2. Add the filename to `members/index.json`:

   ```json
   {
     "members": [
       "alex-chen.json",
       "your-new-file.json"
     ]
   }
   ```

3. Commit + push. The next page load picks it up — no rebuild step.

**Why a manifest file?** GitHub Pages doesn't expose directory listings, so we keep an explicit list. It's the only place that needs touching when someone joins or leaves.

### Wiring the join form

`main.js` currently logs the submission and shows a success message. To deliver it for real, point the form at:
- **[Formspree](https://formspree.io/)** — free tier, swap form `action` to the Formspree URL and remove the `onsubmit` handler.
- **[Netlify Forms](https://docs.netlify.com/forms/setup/)** — only if you switch hosting.
- **Google Form** — embed instead.

## Project structure

```
.
├── index.html          # landing page (Hero + About + Events + Garage + Join)
├── members.html        # members directory (shuffles on load)
├── styles.css          # design system + components
├── main.js             # shared nav / scroll / counter / form
├── members.js          # fetch + render + shuffle members
├── members/
│   ├── index.json      # manifest — list of member files
│   ├── alex-chen.json  # one file per driver
│   └── ...
├── assets/
│   ├── favicon.svg
│   └── og-image.svg
├── CNAME               # custom domain for GH Pages
├── .nojekyll           # tells GH Pages to skip Jekyll
└── README.md
```

## Notes

- Not affiliated with Hyundai Motor Company.
- The site uses `prefers-reduced-motion` to disable animations for users who request it.
- All ride imagery is currently placeholder gradients — drop in real member photos when you have them.
