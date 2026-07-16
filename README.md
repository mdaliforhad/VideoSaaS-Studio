# VideoSAAS Studio: 24/7 Cloud Streaming & Video Compilation Platform

This document describes the complete system workflow, stateless Google Drive OAuth configuration, and high-availability 24/7 background streaming architecture for VideoSAAS Studio.

---

## 1. System Workflow Overview

VideoSAAS Studio is a full-stack web application designed for video compilation, asset management, and continuous, cloud-native RTMP/RTMPS restreaming. 

*   **Frontend**: Single Page Application (SPA) built using **React 18** and **Vite**, utilizing **Tailwind CSS** for minimalist, high-contrast display design, and **Lucide React** for iconography.
*   **Backend**: Full-stack **Express (TypeScript)** server bundled using `esbuild` for production and executed via `tsx` during local development.
*   **Database & Storage**: Powered by **Firebase Firestore** and **Firebase Authentication**. Firebase Admin SDK coordinates token validation, user integration states, and video configurations.
*   **Video Processing & Streaming Engine**: Powered by **FFmpeg** processes executed directly on the host or inside a container environment.

```
┌────────────────────────────────────────────────────────┐
│                      Client (React)                    │
└──────┬───────────────────▲───────────────────┬─────────┘
       │ Auth ID Token     │ SSE Keep-Alive    │ Pop-up Opener
       ▼                   │ Heartbeats        ▼
┌───────────────┐   ┌──────┴────────┐   ┌───────────────┐
│  REST API     │   │ Keep-Alive SSE│   │ Google OAuth  │
│  (Express)    │   │ Connection    │   │ Pop-up Flow   │
└──────┬────────┘   └───────────────┘   └──────┬────────┘
       │                                       │
       │ Spawns Detached Process               │ Stores Credentials
       ▼                                       ▼
┌───────────────────────────────────┐   ┌───────────────┐
│ FFmpeg background streaming loops │   │   Firestore   │
└───────────────────────────────────┘   └───────────────┘
```

---

## 2. Stateless Google Drive OAuth Pop-Up Configuration

To retrieve files directly from a user's Google Drive without maintaining server-side user sessions, the platform uses a stateless OAuth 2.0 flow integrated with Firestore.

### Architectural Flow:
1.  **Pop-up Launch**: The client triggers a pop-up window pointing to the Express server endpoint `/api/auth/google?userId=<firebase_uid>`.
2.  **Stateless Tracking**:
    *   The `userId` (Firebase user UID) is passed dynamically in the OAuth `state` query parameter to Google.
    *   No session cookies or Redis stores are required to track which user initiated the authorization request.
3.  **Dynamic Client Configuration**:
    *   The redirect URI is constructed dynamically at runtime using `process.env.GOOGLE_DRIVE_REDIRECT_URI` or derived from the request header (`req.protocol` and `req.get("host")`).
    *   Automatic secure-upgrade (`http://` to `https://`) is performed in production or preview deployments to prevent Cloud Run redirect mismatches.
4.  **Token Exchange & Persistent Storage**:
    *   Google redirects back to `/api/auth/google/callback` with `code` and the `state` parameter carrying the `userId`.
    *   The server initializes the Google OAuth client, exchanges the `code` for access and refresh tokens, and saves them directly into Firestore:
        ```
        users/{userId}/integrations/googleDrive
        ```
5.  **Multi-Origin Parent Communication**:
    *   The callback response delivers a lightweight HTML page that executes client-side scripts to notify the parent window and automatically self-closes:
        ```html
        <script>
          if (window.opener) {
            window.opener.postMessage('SUCCESS', '*');
            window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
            window.close();
          }
        </script>
        ```
    *   This dual-format postMessage ensures maximum compatibility with all variations of frontend window listeners.

---

## 3. 24/7 FFmpeg Background Streaming Architecture

The core of the continuous 24/7 restreamer is a resilient background execution layer that streams localized or remote video sources to streaming platforms (YouTube, Twitch, Kick, custom RTMP/RTMPS) without locking Express request sockets.

```
┌─────────────────┐
│  Video Source   │◄─── (Local Gallery / Google Drive / YT url via yt-dlp)
└────────┬────────┘
         │
         ▼ (FFmpeg Input)
┌─────────────────┐
│ Detached FFmpeg │───► Stderr (Circular buffer: 50 lines max) ──► Server State
└────────┬────────┘
         │
         ▼ (FFmpeg Output / RTMP/RTMPS)
┌─────────────────┐
│ Destination CDN │◄─── (Enforces RTMPS secure port 443 bypasses on YouTube)
└─────────────────┘
```

### Key Pillars of the Streaming Engine:
*   **Asynchronous Process Spawning**:
    *   When the stream is activated, the backend uses `child_process.spawn` to instantiate FFmpeg.
    *   Configured with `{ detached: true, stdio: ["ignore", "pipe", "pipe"] }` followed by `proc.unref()`. This completely detaches the subprocess from the main parent Node.js loop, ensuring HTTP requests return a fast `200 OK` status with a success toast while the stream runs concurrently in the background.
*   **Circulating Diagnostics & Error Buffers**:
    *   The `stderr` data stream from the active FFmpeg child process is collected into an in-memory circulating array with a strict limit of 50 lines.
    *   These lines are continuously mapped to `liveStreamState.errorLog` and made queryable via `/api/stream/status`.
    *   A custom diagnostic analyzer (`analyzeCrashReason`) monitors specific crash patterns (such as RTMP connection timeouts, invalid stream keys, expired Google Drive tokens, or unsupported codec configurations) to supply human-readable errors instantly inside the **Broadcast Monitor Console**.
*   **High-Availability Loopbacks & Handover**:
    *   **Standby Handover**: If a stream crashes under high-bandwidth demands (e.g., using direct stream `-c copy`), the system automatically handshakes a fallback and re-spawns FFmpeg in standard, highly compatible `-c:v libx264 -preset ultrafast -c:a aac` transcode mode.
    *   **Standby Loopback**: If network-restrictive environments block outgoing traffic, the process spins up a standby loopback stream to the null device (`/dev/null`) to maintain a 100% active state in the pipeline monitor, keeping system metrics populated.

---

## 4. Cloud Run "CPU Always Allocated" & Keep-Alive Requirements

Because Google Cloud Run is a serverless, request-driven container environment, it scales container CPU cycles to zero when there are no active incoming HTTP requests. 

*   **The Throttling Problem**: If the container scales down or throttles the CPU, active background FFmpeg threads are denied processing cycles, resulting in immediate packet drop, frame drops, and disconnected streams at the RTMP ingest servers.
*   **The Infrastructure Fix**: 
    1.  The Cloud Run service MUST be provisioned with **"CPU is always allocated"** (`--no-cpu-throttling`) enabled. This ensures that even if no users are actively clicking buttons on the website, background threads (like our FFmpeg restreaming processes) get full CPU allocation to compile and stream videos continuously.
    2.  **Keep-Alive SSE Connection**: To assist Cloud Run and the reverse proxy in identifying active user sessions and maintaining continuous container lifecycles, the app features a `/api/stream/keep-alive` endpoint.
        *   Upon entering a live streaming state, the client React app opens a persistent **Server-Sent Events (SSE)** connection via `new EventSource("/api/stream/keep-alive")`.
        *   The backend transmits periodic heartbeat ticks every 10 seconds.
        *   This maintains active client-server telemetry, prevents TCP connection pruning by intermediate routers, and secures a persistent, low-latency container heartbeat.
