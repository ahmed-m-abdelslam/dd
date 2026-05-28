# Universal Video Downloader

A production-ready full-stack video downloader.

```
frontend/   Next.js + TypeScript → Vercel
backend/    FastAPI + yt-dlp     → Railway
```

## Supported Platforms

| Platform | Example URL pattern |
|---|---|
| YouTube | youtube.com/watch?v=… · youtu.be/… |
| Facebook | facebook.com/…/videos/… · fb.watch/… |
| Instagram | instagram.com/p/… · instagram.com/reel/… |
| Threads | threads.net/… |
| X / Twitter | x.com/…/status/… · twitter.com/…/status/… |
| LinkedIn | linkedin.com/posts/… |

---

## Quick Start (Local)

```bash
# 1 — Clone the repo
git clone https://github.com/your-username/video-downloader.git
cd video-downloader

# ── Backend ──────────────────────────────────
cd backend
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env → FRONTEND_URL=http://localhost:3000
FRONTEND_URL=http://localhost:3000 uvicorn main:app --reload --port 8000

# ── Frontend (new terminal) ───────────────────
cd frontend
npm install
cp .env.example .env.local
# Edit .env.local → NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev
```

Open http://localhost:3000

---

## Production Deployment (Vercel + Railway)

### Step 1 — Deploy the backend to Railway

1. Sign in at [railway.app](https://railway.app)
2. **New Project → Deploy from GitHub repo**
3. Select your repo, set **Root Directory** → `backend`
4. Under **Variables**, add:
   ```
   FRONTEND_URL=https://PLACEHOLDER   ← update after Step 3
   ```
5. Railway will detect the `Procfile` and start:
   ```
   uvicorn main:app --host 0.0.0.0 --port $PORT
   ```
6. Note your Railway URL: `https://your-service.up.railway.app`

### Step 2 — Deploy the frontend to Vercel

1. Sign in at [vercel.com](https://vercel.com)
2. **Add New → Project → Import** your GitHub repo
3. Set **Root Directory** → `frontend`
4. Under **Environment Variables**, add:
   ```
   NEXT_PUBLIC_API_URL=https://your-service.up.railway.app
   ```
5. Click **Deploy**
6. Note your Vercel URL: `https://your-app.vercel.app`

### Step 3 — Link them together

Go back to Railway → your service → **Variables**, update:
```
FRONTEND_URL=https://your-app.vercel.app
```
Trigger a redeploy on Railway.

---

## Architecture

```
User Browser
    │
    │  POST /api/download {"url": "..."}
    ▼
Vercel (Next.js)
    │
    │  fetch → Railway backend
    ▼
Railway (FastAPI)
    │
    ├─ 1. Validate URL domain (allowlist)
    ├─ 2. Run yt-dlp as subprocess (arg list, no shell)
    ├─ 3. Save to /tmp/downloads/<uuid>.mp4
    ├─ 4. Return {download_url, filename}
    │
    │  GET /api/file/<file_id>.mp4
    ▼
FileResponse → browser saves the file
```

Files are automatically deleted after **10 minutes**.

---

## Environment Variables

| Variable | Service | Description |
|---|---|---|
| `FRONTEND_URL` | Railway | Your Vercel URL — used for CORS |
| `NEXT_PUBLIC_API_URL` | Vercel | Your Railway URL — used by the Next.js client |

---

## Security

- All yt-dlp calls use `subprocess` with an **argument list** — no shell interpolation.
- Only whitelisted domains are accepted; all others return HTTP 400.
- Max download size: 500 MB.
- Download timeout: 120 seconds.
- IP-based rate limiting: 5 requests per 60 seconds.
- CORS restricted to `FRONTEND_URL` only.
- No database, no persistent storage.
