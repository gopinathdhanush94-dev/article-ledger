# Article Ledger — React + Supabase

A real, hosted version of the product catalog: React frontend, PostgreSQL database,
image storage, and login-based edit/delete protection — all served from a public URL
you can open from anywhere.

## What's included

- `src/` — the React app (Vite)
- `supabase/schema.sql` — the database schema, security rules, and image storage bucket setup
- `scripts/migrate.mjs` + `scripts/data/products.json` — one-time script to load your existing 651 products (with images) into the new database

## 1. Create your accounts (all free)

You said you already have GitHub — you'll also need:

- **[supabase.com](https://supabase.com)** — sign up, then click "New Project". Pick any name/region/password (save the DB password somewhere, you likely won't need it again).
- **[vercel.com](https://vercel.com)** — sign up with your GitHub account (one click, no separate password needed).

## 2. Set up the database

1. In your new Supabase project, go to **SQL Editor** → **New query**.
2. Open `supabase/schema.sql` from this project, copy all of it, paste it in, and click **Run**.
   This creates the `products` table, the security rules (public can view, only signed-in users can add/edit/delete), and the image storage bucket.
3. Go to **Project Settings → API**. You'll need two values from here in a minute:
   - **Project URL**
   - **anon public** key

## 3. Create your admin login

Since edit/delete now requires a real login instead of a password baked into a file:

1. In Supabase, go to **Authentication → Users → Add user**.
2. Enter an email and password for yourself (or whoever should be able to edit the catalog). You can add more people later the same way.

## 4. Load your existing 651 products

This runs once, from your own computer (not from GitHub/Vercel):

```bash
npm install
cp .env.example .env
```

Open `.env` and fill in:
- `VITE_SUPABASE_URL` — the Project URL from step 2
- `SUPABASE_SERVICE_ROLE_KEY` — from **Project Settings → API → service_role key** (this key is powerful — never share it or commit it; it's only used for this one-time import)

Then run:

```bash
npm run migrate
```

This uploads all 543 product images to Supabase Storage and inserts all 651 rows. It's safe to re-run — it skips anything already imported. It'll take a few minutes since it's uploading real image files.

## 5. Put it on GitHub

```bash
git init
git add .
git commit -m "Article Ledger — React + Supabase"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO-NAME.git
git push -u origin main
```

(Create the empty repo on GitHub first via the "New repository" button — don't initialize it with a README there, since this project already has one.)

## 6. Deploy on Vercel

1. In Vercel, click **Add New → Project**, and import the GitHub repo you just pushed.
2. Vercel will auto-detect it's a Vite project — leave the defaults.
3. Before deploying, add two **Environment Variables**:
   - `VITE_SUPABASE_URL` = your Project URL
   - `VITE_SUPABASE_ANON_KEY` = your anon public key

   (Don't add the service role key here — the live site never needs it.)
4. Click **Deploy**. In about a minute you'll get a live URL like `article-ledger.vercel.app` — that's your app, reachable from any device, anywhere.

From now on, any time you push new code to the `main` branch on GitHub, Vercel automatically redeploys.

## Local development

```bash
npm install
cp .env.example .env   # fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm run dev
```

Opens at `http://localhost:5173`.

## How the pieces fit together

- **Anyone** who opens the site can browse, search, filter, and download the catalog — no login needed.
- **Only signed-in users** can add, edit, bulk-upload, or delete — enforced by Supabase's Row Level Security, not just hidden buttons in the app. This is real server-side protection, unlike the old single-file version's hardcoded password.
- **Images** live in Supabase Storage (a proper file storage service), not embedded as base64 text — much faster to load, and the app itself stays small.
- **The database** is a real PostgreSQL instance — you can also browse/edit it directly in the Supabase dashboard under **Table Editor** any time.

## Adding more admin users later

Supabase → Authentication → Users → Add user. That's it — no code changes needed.

## Garments page (separate dataset)

The **Garments** tab is a second, independent catalog for garment-specific data (brand, model, size, color, set-packing ratio) — it doesn't touch the products table at all.

To set it up:

1. In Supabase SQL Editor, run `supabase/garments_schema.sql` (this must run *after* `supabase/schema.sql`, since it reuses a function defined there).
2. From your project folder, with `.env` already filled in:
   ```
   npm run migrate-garments
   ```
   This loads all 2,065 size/color rows and uploads the 470 product images to a separate `garment-images` storage bucket. Safe to re-run.
3. Redeploy (or just refresh, if you're already deployed) — the Garments tab will now show real data.

Each card in the Garments tab represents one style + color combination; click it to see the full size run (every size, its set-packing quantity, EAN, and article number) in one table.
