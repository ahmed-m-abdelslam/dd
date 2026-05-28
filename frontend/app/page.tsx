"use client";

import { useState, useRef, FormEvent } from "react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const PLATFORMS = [
  "YouTube",
  "Facebook",
  "Instagram",
  "Threads",
  "X / Twitter",
  "LinkedIn",
];

interface DownloadResult {
  success: boolean;
  download_url: string;
  filename: string;
}

type Status = "idle" | "loading" | "success" | "error";

// ── SVG icons ────────────────────────────────
function DownloadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}>
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  );
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<DownloadResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) {
      inputRef.current?.focus();
      return;
    }

    setStatus("loading");
    setResult(null);
    setErrorMsg("");

    try {
      const res = await fetch(`${API_URL}/api/download`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || `Server error (${res.status})`);
      }

      setResult(data as DownloadResult);
      setStatus("success");
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      setErrorMsg(msg);
      setStatus("error");
    }
  }

  function reset() {
    setUrl("");
    setStatus("idle");
    setResult(null);
    setErrorMsg("");
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  return (
    <>
      <div className="page-glow" aria-hidden />
      <div className="page-wrapper">
        <main className="card">
          {/* Header */}
          <h1 className="title">Universal Video&nbsp;Downloader</h1>
          <p className="subtitle">
            Download videos from YouTube, Facebook, Instagram, Threads, X, and LinkedIn.
          </p>

          {/* Platform badges */}
          <div className="badge-row" aria-label="Supported platforms">
            {PLATFORMS.map((p) => (
              <span key={p} className="badge">{p}</span>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate>
            <label htmlFor="video-url" className="label">Video URL</label>
            <input
              ref={inputRef}
              id="video-url"
              type="url"
              className="url-input"
              placeholder="Paste video link here…"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={status === "loading"}
              autoFocus
              autoComplete="off"
              spellCheck={false}
            />

            <button
              type="submit"
              className="btn-primary"
              disabled={status === "loading" || !url.trim()}
            >
              {status === "loading" ? (
                <>
                  <span className="spinner" aria-hidden />
                  Downloading…
                </>
              ) : (
                <>
                  <DownloadIcon />
                  {" "}Download Video
                </>
              )}
            </button>
          </form>

          {/* Loading progress */}
          {status === "loading" && (
            <div className="progress-bar-wrap" role="progressbar" aria-label="Downloading">
              <div className="progress-bar-fill" />
            </div>
          )}

          {/* Error */}
          {status === "error" && (
            <div className="status-error" role="alert">
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
                <AlertIcon />
                <span>{errorMsg}</span>
              </div>
              <button
                onClick={reset}
                style={{
                  marginTop: "0.65rem",
                  background: "none",
                  border: "none",
                  color: "inherit",
                  cursor: "pointer",
                  fontSize: "0.82rem",
                  padding: 0,
                  textDecoration: "underline",
                  opacity: 0.8,
                }}
              >
                Try again
              </button>
            </div>
          )}

          {/* Success */}
          {status === "success" && result && (
            <>
              <div className="status-success" role="status">
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  <CheckIcon />
                  <span>Video is ready — click below to save it.</span>
                </div>
              </div>

              <a
                href={result.download_url}
                download={result.filename}
                className="btn-download"
              >
                <DownloadIcon />
                Save {result.filename}
              </a>

              <hr className="divider" />

              <button
                onClick={reset}
                style={{
                  width: "100%",
                  background: "none",
                  border: "none",
                  color: "var(--muted)",
                  cursor: "pointer",
                  fontSize: "0.85rem",
                  padding: "0.25rem",
                  transition: "color 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted)")}
              >
                ↩ Download another video
              </button>
            </>
          )}
        </main>

        <p className="footer-note">
          For personal use only. Respect platform terms of service and copyright law.
          <br />
          Files expire after 10 minutes. No data is stored permanently.
        </p>
      </div>
    </>
  );
}
