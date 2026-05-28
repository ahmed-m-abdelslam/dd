# Video Downloader — Backend (FastAPI + yt-dlp)

## Stack
- **FastAPI** — REST API framework
- **yt-dlp** — Video download engine
- **Railway** — Hosting platform

---

## Local Development

### Prerequisites
- Python 3.11+
- `yt-dlp` installed system-wide (`pip install yt-dlp`) or available in your virtual env
- `ffmpeg` installed (required by yt-dlp for merging streams)

### Setup

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy and edit environment variables
cp .env.example .env
# Edit .env and set FRONTEND_URL=http://localhost:3000

# Run the server
uvicorn main:app --reload --port 8000
```

The API will be available at http://localhost:8000

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET  | `/` | Health check |
| POST | `/api/download` | Download a video by URL |
| GET  | `/api/file/{file_id}` | Serve a downloaded file |

### POST /api/download — Example

```bash
curl -X POST http://localhost:8000/api/download \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}'
```

Response:
```json
{
  "success": true,
  "download_url": "http://localhost:8000/api/file/abc123.mp4",
  "filename": "video.mp4"
}
```

---

## Deploy to Railway

### 1. Create a Railway project

1. Go to [railway.app](https://railway.app) and sign in.
2. Click **New Project → Deploy from GitHub repo**.
3. Select your repository and choose the `backend` folder as the root directory
   (Settings → Root Directory → `backend`).

### 2. Set environment variables

In Railway → your service → **Variables**, add:

```
FRONTEND_URL=https://your-app.vercel.app
```

Replace the value with your actual Vercel URL once the frontend is deployed.

### 3. Railway will auto-detect the Procfile

The `Procfile` tells Railway to run:
```
uvicorn main:app --host 0.0.0.0 --port $PORT
```

Railway injects `$PORT` automatically.

### 4. Verify deployment

After the build finishes, Railway gives you a public URL like:
```
https://your-service.up.railway.app
```

Test it:
```bash
curl https://your-service.up.railway.app/
# {"status":"ok","service":"video-downloader-api"}
```

### 5. Note the backend URL

Copy `https://your-service.up.railway.app` — you'll need it for the frontend's
`NEXT_PUBLIC_API_URL` environment variable.

---

## ffmpeg on Railway

yt-dlp requires `ffmpeg` to merge video+audio streams. Railway's default Nixpacks
builder will install it automatically when it detects yt-dlp.

If it doesn't, add a `nixpacks.toml` in the backend folder:

```toml
[phases.setup]
nixPkgs = ["ffmpeg"]
```

---

## Security notes

- User input is **never** passed as a raw shell string — only as a list argument to `subprocess`.
- Domain allowlist rejects unsupported platforms before yt-dlp is invoked.
- Files are auto-deleted after 10 minutes.
- Max file size is capped at 500 MB.
- Basic IP-based rate limiting (5 requests / 60 s) is applied.
