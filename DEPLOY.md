# Deploy: Backend on Render, Frontend on Vercel

This repo is set up so the **Node API runs on Render** and the **Vite/React frontend runs on Vercel**. Deploy in this order: backend first, then frontend (so you have the API URL for the frontend env).

---

## 1. Backend on Render

1. Go to [Render](https://render.com) and sign in. **New → Web Service**.
2. Connect your GitHub repo: `arshdeepsinghmalhi/studentSUNSTONE PRIME` (or use the repo you pushed).
3. Configure:
   - **Name:** `student-test-portal-api` (or any name).
   - **Region:** your choice (e.g. Oregon).
   - **Branch:** `main`.
   - **Root Directory:** leave blank (use repo root).
   - **Runtime:** Node.
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
4. **Environment variables** (Add in Render dashboard; do not commit secrets):
   - `GOOGLE_SHEETS_ID` = your spreadsheet ID (e.g. `1AInMgyVaj9XGexA8-z-JDFcHjPpsxs3iCZ6a0IrVVlM`)
   - `GOOGLE_SHEETS_RANGE` = `userDetails!A:Z` (or your sheet/range)
   - `GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL` = service account email
   - `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` = full private key; use literal `\n` for newlines (paste as one line, with `\n` where the key has line breaks)
5. Create Web Service. Wait for the first deploy.
6. Copy the **backend URL**, e.g. `https://student-test-portal-api.onrender.com` (no trailing slash). You need this for the frontend.

**Optional:** Use a **Blueprint** (Infrastructure as Code): connect the repo and add a `render.yaml` from the repo. Then add the env var values in the Render dashboard (they are not stored in the YAML).

---

## 2. Frontend on Vercel

1. Go to [Vercel](https://vercel.com) and sign in. **Add New → Project**.
2. Import the same GitHub repo.
3. Configure:
   - **Framework Preset:** Vite (or leave auto-detected).
   - **Root Directory:** leave blank.
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. **Environment variables:**
   - **Name:** `VITE_API_URL`
   - **Value:** your Render backend URL from step 1, e.g. `https://student-test-portal-api.onrender.com` (no trailing slash)
   - Add for **Production** (and Preview if you want).
5. Deploy. The site will be at `https://your-project.vercel.app` (or your custom domain).

The frontend will call `VITE_API_URL + '/api/check-eligibility'` in production; locally it uses the Vite proxy to `http://localhost:5000`.

---

## Summary

| Part        | Host   | Build / Start                    | Env (key ones)                                                                 |
|------------|--------|-----------------------------------|---------------------------------------------------------------------------------|
| Backend API| Render | `npm install` → `npm start`       | `GOOGLE_SHEETS_ID`, `GOOGLE_SHEETS_RANGE`, `GOOGLE_SERVICE_ACCOUNT_*`           |
| Frontend   | Vercel | `npm run build` → serve `dist`   | `VITE_API_URL` = Render backend URL (no trailing slash)                         |

**CORS:** The backend allows all origins (`*`). To restrict to your Vercel domain later, set an env var (e.g. `ALLOWED_ORIGIN`) and use it in the backend CORS middleware.
