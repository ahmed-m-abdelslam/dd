# Video Downloader — Frontend (Next.js)

## Stack
- **Next.js 14** (App Router) with TypeScript
- **Tailwind CSS** for utility classes
- **Custom CSS** for the design system
- **Vercel** for hosting

---

## Local Development

### Prerequisites
- Node.js 18+
- npm or yarn

### Setup

```bash
cd frontend

# Install dependencies
npm install

# Copy and edit environment variables
cp .env.example .env.local
# Edit .env.local and set:
# NEXT_PUBLIC_API_URL=http://localhost:8000

# Run the dev server
npm run dev
```

Open http://localhost:3000 in your browser.

---

## Deploy to Vercel

### 1. Push to GitHub

Commit the entire repo (or just the `frontend` folder) to GitHub.

### 2. Import project in Vercel

1. Go to [vercel.com](https://vercel.com) and sign in.
2. Click **Add New → Project**.
3. Import your GitHub repository.
4. Set **Root Directory** to `frontend` (under Framework Preset settings).
5. Vercel will auto-detect Next.js.

### 3. Set environment variable

Under **Settings → Environment Variables**, add:

```
NEXT_PUBLIC_API_URL = https://your-service.up.railway.app
```

Replace the value with your actual Railway backend URL.

### 4. Deploy

Click **Deploy**. Vercel will build and publish the app.

After deployment you'll get a URL like:
```
https://your-app.vercel.app
```

### 5. Update the backend

Go to your Railway service → **Variables** and set:
```
FRONTEND_URL=https://your-app.vercel.app
```

Then redeploy the Railway service so the CORS settings take effect.

---

## Connecting Frontend ↔ Backend

| Variable | Where to set it | Value |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Vercel Environment Variables | Your Railway URL |
| `FRONTEND_URL` | Railway Environment Variables | Your Vercel URL |

Both values must be set for the app to work correctly.

---

## Local Full-Stack Development

```bash
# Terminal 1 — backend
cd backend
source venv/bin/activate
FRONTEND_URL=http://localhost:3000 uvicorn main:app --reload --port 8000

# Terminal 2 — frontend
cd frontend
NEXT_PUBLIC_API_URL=http://localhost:8000 npm run dev
```
