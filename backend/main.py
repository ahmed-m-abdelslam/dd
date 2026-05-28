import os
import uuid
import asyncio
import threading
from pathlib import Path
from datetime import datetime, timedelta
from urllib.parse import urlparse
from collections import defaultdict

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

# ──────────────────────────────────────────────
# Configuration
# ──────────────────────────────────────────────
FRONTEND_URL = os.environ.get("FRONTEND_URL", "").strip().rstrip("/")
DOWNLOAD_DIR = Path("/tmp/downloads")
DOWNLOAD_DIR.mkdir(parents=True, exist_ok=True)
DOWNLOAD_TIMEOUT = 120
FILE_TTL = 600
CLEANUP_INTERVAL = 120
RATE_LIMIT_REQUESTS = 5
RATE_LIMIT_WINDOW = 60

ALLOWED_DOMAINS = {
    "youtube.com", "www.youtube.com", "youtu.be", "m.youtube.com",
    "facebook.com", "www.facebook.com", "m.facebook.com", "fb.watch",
    "instagram.com", "www.instagram.com",
    "threads.net", "www.threads.net",
    "x.com", "www.x.com", "twitter.com", "www.twitter.com",
    "linkedin.com", "www.linkedin.com",
}

VALID_EXTENSIONS = {".mp4", ".mkv", ".webm", ".mov", ".m4a", ".mp3"}

# ──────────────────────────────────────────────
# Build origins list
# ──────────────────────────────────────────────
def build_origins() -> list[str]:
    origins = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]
    if FRONTEND_URL:
        origins.append(FRONTEND_URL)
        if FRONTEND_URL.startswith("https://") and not FRONTEND_URL.startswith("https://www."):
            origins.append(FRONTEND_URL.replace("https://", "https://www.", 1))
    return origins

CORS_ORIGINS = build_origins()

# ──────────────────────────────────────────────
# App setup
# ──────────────────────────────────────────────
app = FastAPI(title="Video Downloader API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# ──────────────────────────────────────────────
# Rate limiting
# ──────────────────────────────────────────────
rate_store: dict[str, list[datetime]] = defaultdict(list)
rate_lock = threading.Lock()

def check_rate_limit(ip: str) -> bool:
    now = datetime.utcnow()
    window_start = now - timedelta(seconds=RATE_LIMIT_WINDOW)
    with rate_lock:
        timestamps = [t for t in rate_store[ip] if t > window_start]
        rate_store[ip] = timestamps
        if len(timestamps) >= RATE_LIMIT_REQUESTS:
            return False
        rate_store[ip].append(now)
        return True

# ──────────────────────────────────────────────
# Background file cleanup
# ──────────────────────────────────────────────
def cleanup_old_files():
    now = datetime.utcnow()
    for f in DOWNLOAD_DIR.iterdir():
        if f.is_file():
            age = now - datetime.utcfromtimestamp(f.stat().st_mtime)
            if age.total_seconds() > FILE_TTL:
                try:
                    f.unlink()
                except OSError:
                    pass

def schedule_cleanup():
    cleanup_old_files()
    timer = threading.Timer(CLEANUP_INTERVAL, schedule_cleanup)
    timer.daemon = True
    timer.start()

@app.on_event("startup")
def startup_event():
    schedule_cleanup()
    print(f"[startup] CORS origins: {CORS_ORIGINS}")
    # نتأكد إن ffmpeg متثبت
    import shutil
    ffmpeg_path = shutil.which("ffmpeg")
    if ffmpeg_path:
        print(f"[startup] ffmpeg found at: {ffmpeg_path}")
    else:
        print("[startup] WARNING: ffmpeg NOT FOUND! Video+audio merging will fail.")

# ──────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────
class DownloadRequest(BaseModel):
    url: str

def validate_url(raw_url: str) -> str:
    try:
        parsed = urlparse(raw_url)
        if parsed.scheme not in ("http", "https"):
            raise ValueError("Invalid scheme")
        domain = parsed.netloc.lower()
        if domain not in ALLOWED_DOMAINS:
            raise ValueError(f"Unsupported domain: {domain}")
        return raw_url
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

def get_backend_base(request: Request) -> str:
    forwarded_proto = request.headers.get("x-forwarded-proto", request.url.scheme)
    forwarded_host = request.headers.get("x-forwarded-host", request.url.netloc)
    return f"{forwarded_proto}://{forwarded_host}"

# ──────────────────────────────────────────────
# Endpoints
# ──────────────────────────────────────────────
@app.get("/")
def health():
    import shutil
    return {
        "status": "ok",
        "service": "video-downloader-api",
        "cors_origins": CORS_ORIGINS,
        "ffmpeg_available": shutil.which("ffmpeg") is not None,
    }

@app.post("/api/download")
async def download_video(payload: DownloadRequest, request: Request):
    client_ip = request.headers.get("x-forwarded-for", request.client.host).split(",")[0].strip()
    if not check_rate_limit(client_ip):
        raise HTTPException(status_code=429, detail="Too many requests. Please wait a moment.")

    url = validate_url(payload.url.strip())
    print(f"[download] Starting download for URL: {url}")

    file_id = str(uuid.uuid4())
    output_template = str(DOWNLOAD_DIR / f"{file_id}.%(ext)s")

    cmd = [
        "yt-dlp",
        "--no-playlist",
        "--max-filesize", "500m",
        "--format", "bestvideo[ext=mp4][vcodec^=avc]+bestaudio[ext=m4a]/bestvideo[ext=mp4]+bestaudio/best[ext=mp4]/best",
        "--merge-output-format", "mp4",
        "--output", output_template,
        "--no-part",
        "--no-mtime",
        "--restrict-filenames",
        "--verbose",
        "--",
        url,
    ]

    try:
        proc = await asyncio.wait_for(
            asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            ),
            timeout=10,
        )
        try:
            stdout, stderr = await asyncio.wait_for(
                proc.communicate(), timeout=DOWNLOAD_TIMEOUT
            )
        except asyncio.TimeoutError:
            proc.kill()
            raise HTTPException(status_code=504, detail="Download timed out. The video may be too large.")
    except asyncio.TimeoutError:
        raise HTTPException(status_code=504, detail="Failed to start download process.")
    except FileNotFoundError:
        raise HTTPException(status_code=500, detail="yt-dlp is not installed on the server.")

    if proc.returncode != 0:
        err_msg = stderr.decode(errors="replace").strip()
        out_msg = stdout.decode(errors="replace").strip()
        print("=" * 70)
        print(f"[yt-dlp FAILED] URL: {url}")
        print(f"[yt-dlp RETURN CODE]: {proc.returncode}")
        print(f"[yt-dlp STDOUT]:\n{out_msg}")
        print(f"[yt-dlp STDERR]:\n{err_msg}")
        print("=" * 70)

        if "Unsupported URL" in err_msg or "Unable to extract" in err_msg:
            raise HTTPException(status_code=422, detail="Could not extract video from this URL. It may be private or unsupported.")
        if "Private video" in err_msg or "login required" in err_msg.lower():
            raise HTTPException(status_code=403, detail="This video is private or requires login.")
        if "Sign in to confirm" in err_msg or "bot" in err_msg.lower():
            raise HTTPException(status_code=403, detail="The video platform is blocking the server. Cookies may be required.")
        if "DRM" in err_msg:
            raise HTTPException(status_code=403, detail="DRM-protected content cannot be downloaded.")
        raise HTTPException(status_code=422, detail=f"Download failed: {err_msg[:300]}")

    # ─── Find the downloaded file ───
    all_files = list(DOWNLOAD_DIR.glob(f"{file_id}*"))
    matches = [
        f for f in all_files
        if f.is_file() and f.suffix.lower() in VALID_EXTENSIONS
    ]

    if not matches:
        print(f"[ERROR] No valid file found after download for ID: {file_id}")
        print(f"[ERROR] Files in dir: {[f.name for f in all_files]}")
        raise HTTPException(status_code=500, detail="Download appeared to succeed but no file was found.")

    # نختار أكبر ملف (عادةً الفيديو النهائي المدمج)
    output_file = max(matches, key=lambda f: f.stat().st_size)
    final_ext = output_file.suffix.lower()

    # نعيد تسمية الملف لاسم نضيف عشان نتفادى الـ suffixes الغريبة من yt-dlp
    clean_path = DOWNLOAD_DIR / f"{file_id}{final_ext}"
    if output_file != clean_path:
        try:
            if clean_path.exists():
                clean_path.unlink()
            output_file.rename(clean_path)
            output_file = clean_path
            print(f"[download] Renamed to clean name: {output_file.name}")
        except OSError as e:
            print(f"[download] Rename failed: {e}, using original name")

    # نمسح أي ملفات تانية متبقية بنفس الـ file_id
    for f in all_files:
        if f.exists() and f != output_file:
            try:
                f.unlink()
                print(f"[download] Cleaned up leftover: {f.name}")
            except OSError:
                pass

    filename = f"video{final_ext}"
    backend_base = get_backend_base(request)

    print(f"[download] SUCCESS: {output_file.name} ({output_file.stat().st_size} bytes)")

    return {
        "success": True,
        "download_url": f"{backend_base}/api/file/{output_file.name}",
        "filename": filename,
    }

@app.get("/api/file/{file_id}")
def serve_file(file_id: str):
    safe_chars = set("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_.")
    if not all(c in safe_chars for c in file_id) or ".." in file_id or "/" in file_id:
        raise HTTPException(status_code=400, detail="Invalid file ID.")

    file_path = DOWNLOAD_DIR / file_id
    if not file_path.exists() or not file_path.is_file():
        print(f"[serve_file] File not found: {file_id}")
        print(f"[serve_file] Available files: {[f.name for f in DOWNLOAD_DIR.iterdir() if f.is_file()]}")
        raise HTTPException(status_code=404, detail="File not found or has expired.")

    ext = file_path.suffix.lstrip(".").lower()
    media_type_map = {
        "mp4": "video/mp4",
        "webm": "video/webm",
        "mkv": "video/x-matroska",
        "mov": "video/quicktime",
        "m4a": "audio/mp4",
        "mp3": "audio/mpeg",
    }
    media_type = media_type_map.get(ext, "application/octet-stream")

    file_size = file_path.stat().st_size
    print(f"[serve_file] Serving {file_path.name} ({file_size} bytes, type={media_type})")

    return FileResponse(
        path=str(file_path),
        media_type=media_type,
        filename=f"video.{ext}",
        headers={"Content-Disposition": f'attachment; filename="video.{ext}"'},
    )
