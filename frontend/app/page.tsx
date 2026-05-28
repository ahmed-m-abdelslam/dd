"use client";

import { useState, useRef, useEffect, FormEvent } from "react";

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
type ToastType = "success" | "error" | null;

// ── SVG icons ────────────────────────────────
function DownloadIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  );
}

function CheckIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
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

function PasteIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  );
}

function LogoIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  );
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<DownloadResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [loadingStep, setLoadingStep] = useState(0);
  const [toast, setToast] = useState<{ type: ToastType; msg: string }>({ type: null, msg: "" });
  const inputRef = useRef<HTMLInputElement>(null);

  // Cycle through loading steps for nice UX
  useEffect(() => {
    if (status !== "loading") {
      setLoadingStep(0);
      return;
    }
    const timers = [
      setTimeout(() => setLoadingStep(1), 800),
      setTimeout(() => setLoadingStep(2), 4000),
      setTimeout(() => setLoadingStep(3), 12000),
    ];
    return () => timers.forEach(clearTimeout);
  }, [status]);

  // Show toast and auto-dismiss
  useEffect(() => {
    if (toast.type) {
      const t = setTimeout(() => setToast({ type: null, msg: "" }), 4000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  // Keyboard shortcuts: Esc resets
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && status !== "loading") {
        reset();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function handlePaste() {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text.trim());
        inputRef.current?.focus();
      }
    } catch {
      setToast({ type: "error", msg: "Couldn't access clipboard. Paste manually." });
    }
  }

  function handleClear() {
    setUrl("");
    inputRef.current?.focus();
  }

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
      setToast({ type: "success", msg: "Video downloaded successfully!" });
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      setErrorMsg(msg);
      setStatus("error");
      setToast({ type: "error", msg: "Download failed." });
    }
  }

  function reset() {
    setUrl("");
    setStatus("idle");
    setResult(null);
    setErrorMsg("");
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  const steps = [
    "Connecting to source",
    "Fetching video data",
    "Downloading media",
    "Processing & finalizing",
  ];

  return (
    <>
      <div className="page-glow" aria-hidden />
      <div className="page-glow-secondary" aria-hidden />

      <div className="page-wrapper">
        {/* Brand header */}
        <div className="brand-header">
          <div className="brand-logo">
            <LogoIcon />
          </div>
          <span className="brand-name">VidGrab</span>
        </div>

        <main className="card">
          {/* Header */}
          <h1 className="title">
            Universal Video<br />
            <span className="title-accent">Downloader</span>
          </h1>
          <p className="subtitle">
            Download videos from YouTube, Facebook, Instagram, Threads, X, and LinkedIn in one click.
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

            <div className="input-wrap">
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
              <div className="input-actions">
                {url && status !== "loading" && (
                  <button
                    type="button"
                    className="input-action-btn"
                    onClick={handleClear}
                    aria-label="Clear input"
                    title="Clear"
                  >
                    <XIcon />
                  </button>
                )}
                <button
                  type="button"
                  className="input-action-btn"
                  onClick={handlePaste}
                  disabled={status === "loading"}
                  aria-label="Paste from clipboard"
                  title="Paste from clipboard"
                >
                  <PasteIcon />
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={status === "loading" || !url.trim()}
            >
              {status === "loading" ? (
                <>
                  <span className="spinner" aria-hidden />
                  Working on it…
                </>
              ) : (
                <>
                  <DownloadIcon />
                  Download Video
                </>
              )}
            </button>
          </form>

          {/* Loading state */}
          {status === "loading" && (
            <>
              <div className="progress-bar-wrap" role="progressbar" aria-label="Downloading">
                <div className="progress-bar-fill" />
              </div>

              <div className="loading-steps">
                {steps.map((label, i) => {
                  const isDone = i < loadingStep;
                  const isActive = i === loadingStep;
                  return (
                    <div
                      key={label}
                      className={`step ${isActive ? "active" : ""} ${isDone ? "done" : ""}`}
                    >
                      <span className="step-indicator">
                        {isDone && <CheckIcon size={10} />}
                      </span>
                      <span>{label}</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Error */}
          {status === "error" && (
            <div className="status-error" role="alert">
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
                <AlertIcon />
                <span>{errorMsg}</span>
              </div>
              <button onClick={reset} className="btn-text-link">
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
                  <span>Your video is ready — click below to save it.</span>
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

              <button onClick={reset} className="btn-reset">
                ↩ Download another video
              </button>
            </>
          )}

          {/* Keyboard hint */}
          {status === "idle" && (
            <div className="kbd-hint" style={{ marginTop: "1rem", justifyContent: "center", display: "flex" }}>
              Press <span className="kbd">Esc</span> to clear at any time
            </div>
          )}
        </main>

        <div className="footer-note">
          For personal use only. Respect platform terms of service and copyright law.
          <br />
          Files expire after 10 minutes. No data is stored permanently.

          <div className="footer-links">
            <a href="#" onClick={(e) => e.preventDefault()}>Privacy</a>
            <a href="#" onClick={(e) => e.preventDefault()}>Terms</a>
            <a href="#" onClick={(e) => e.preventDefault()}>How it works</a>
          </div>

          <div className="footer-credit">
            Made with <span className="heart">♥</span> for the open web
          </div>
        </div>
      </div>

      {/* Toast notification */}
      {toast.type && (
        <div className="toast-container">
          <div className={`toast ${toast.type}`}>
            {toast.type === "success" ? <CheckIcon /> : <AlertIcon />}
            <span>{toast.msg}</span>
          </div>
        </div>
      )}
    </>
  );
}
