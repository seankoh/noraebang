# Noraebang — Functional Specification Document (FSD)

**Version:** 1.0
**Date:** 2026-02-27
**Status:** Approved

---

## 1. Purpose

This document defines the functional requirements, user interactions, API contracts, data models, and UI behaviour for the Noraebang web application. It serves as the single source of truth for implementation.

---

## 2. System Overview

Noraebang is a browser-based karaoke platform. A single **admin** account manages all content. **Visitors** (no account required) can browse, search, watch, like, and comment on tracks.

### 2.1 User Roles

| Role    | Description                                           | Auth Required |
|---------|-------------------------------------------------------|---------------|
| Visitor | Browse, search, play tracks, like, post comments      | No            |
| Admin   | All visitor actions + upload, edit, delete tracks and delete comments | Yes (password) |

---

## 3. Tech Stack

| Layer        | Technology                          |
|--------------|-------------------------------------|
| Runtime      | Node.js                             |
| Framework    | Express.js                          |
| Database     | SQLite via `better-sqlite3`         |
| Sessions     | `express-session` + `connect-sqlite3` |
| Auth         | `bcryptjs` (password hashing)       |
| File Upload  | `multer` (multipart/form-data)      |
| Thumbnails   | `fluent-ffmpeg` (auto-extract at 5s)|
| Frontend     | HTML5 + Vanilla JavaScript          |
| Styling      | Tailwind CSS (CDN)                  |
| Search       | SQLite FTS5 (built-in)              |
| Deployment   | Single Node.js process on VPS       |

---

## 4. Data Models

### 4.1 tracks

| Column         | Type    | Constraints              | Description                        |
|----------------|---------|--------------------------|------------------------------------|
| id             | INTEGER | PRIMARY KEY AUTOINCREMENT| Unique track ID                    |
| title          | TEXT    | NOT NULL                 | Song title                         |
| artist         | TEXT    | NOT NULL                 | Artist / performer name            |
| genre          | TEXT    |                          | K-Pop, Pop, R&B, Rock, Ballad, Jazz|
| language       | TEXT    |                          | Korean, English, Japanese, Chinese |
| video_path     | TEXT    | NOT NULL                 | Filename in /uploads/videos/       |
| lrc_path       | TEXT    |                          | Filename in /uploads/lrc/ (optional)|
| thumbnail_path | TEXT    |                          | Filename in /uploads/thumbnails/   |
| views          | INTEGER | DEFAULT 0                | Incremented on each track page load|
| created_at     | TEXT    | DEFAULT datetime('now')  | ISO 8601 timestamp                 |

### 4.2 likes

| Column     | Type    | Constraints                        | Description                  |
|------------|---------|------------------------------------|------------------------------|
| id         | INTEGER | PRIMARY KEY AUTOINCREMENT          |                              |
| track_id   | INTEGER | REFERENCES tracks(id) ON DELETE CASCADE | Foreign key            |
| session_id | TEXT    | NOT NULL                           | Express session ID           |
| created_at | TEXT    | DEFAULT datetime('now')            |                              |
|            |         | UNIQUE(track_id, session_id)       | One like per session per track|

### 4.3 comments

| Column     | Type    | Constraints                        | Description                       |
|------------|---------|------------------------------------|-----------------------------------|
| id         | INTEGER | PRIMARY KEY AUTOINCREMENT          |                                   |
| track_id   | INTEGER | REFERENCES tracks(id) ON DELETE CASCADE | Foreign key                  |
| name       | TEXT    | NOT NULL, max 50 chars             | Commenter's display name          |
| content    | TEXT    | NOT NULL, max 1000 chars           | Comment body                      |
| created_at | TEXT    | DEFAULT datetime('now')            |                                   |

### 4.4 tracks_fts (FTS5 Virtual Table)

Mirrors `title` and `artist` from `tracks`. Kept in sync via INSERT/UPDATE/DELETE triggers. Used exclusively by `GET /api/search`.

---

## 5. API Specification

Base path: `/api`
All responses: `Content-Type: application/json`
Auth: session cookie (`isAdmin = true`)

### 5.1 Admin Auth

#### `POST /api/admin/login`
**Body:** `{ "username": string, "password": string }`
**Success 200:** `{ "ok": true }`
**Failure 401:** `{ "error": "Invalid credentials" }`
**Behaviour:** Validates username against `ADMIN_USERNAME` env var. Compares password with `ADMIN_PASSWORD_HASH` using bcryptjs. Calls `req.session.regenerate()` then sets `req.session.isAdmin = true`.

#### `POST /api/admin/logout`
**Auth required:** Yes
**Success 200:** `{ "ok": true }`
**Behaviour:** Destroys session.

#### `GET /api/admin/me`
**Success 200:** `{ "isAdmin": true | false }`
**Behaviour:** Returns session state. Never errors — always returns 200. Used by all pages to conditionally show admin UI.

---

### 5.2 Tracks

#### `GET /api/tracks`
**Query params:**

| Param    | Type   | Default  | Description                        |
|----------|--------|----------|------------------------------------|
| page     | int    | 1        | Pagination page (1-indexed)        |
| limit    | int    | 20       | Items per page (max 50)            |
| genre    | string | —        | Filter by genre (exact match)      |
| language | string | —        | Filter by language (exact match)   |
| sort     | string | newest   | `newest` or `views`                |

**Success 200:**
```json
{
  "tracks": [
    {
      "id": 1,
      "title": "Spring Day",
      "artist": "BTS",
      "genre": "K-Pop",
      "language": "Korean",
      "video_path": "1706123456789-video.mp4",
      "lrc_path": "1706123456789-lyrics.lrc",
      "thumbnail_path": "1706123456789-thumb.jpg",
      "views": 1024,
      "like_count": 42,
      "created_at": "2026-02-27T10:00:00"
    }
  ],
  "total": 100,
  "page": 1,
  "limit": 20
}
```

#### `GET /api/tracks/:id`
**Success 200:** Single track object (same shape as above)
**Failure 404:** `{ "error": "Track not found" }`
**Behaviour:** Atomically increments `views` by 1 before returning.

#### `POST /api/tracks`
**Auth required:** Yes
**Content-Type:** `multipart/form-data`
**Fields:**

| Field    | Type   | Required | Description                     |
|----------|--------|----------|---------------------------------|
| video    | file   | Yes      | MP4 or WebM, max 2 GB           |
| lrc      | file   | No       | Plain text .lrc file            |
| title    | string | Yes      | Song title                      |
| artist   | string | Yes      | Artist name                     |
| genre    | string | No       | Genre category                  |
| language | string | No       | Language                        |

**Success 201:** Newly created track object
**Failure 400:** `{ "error": "title and artist are required" }`
**Behaviour:** Saves files to disk with UUID-like names. Inserts track record. Responds immediately. Asynchronously runs ffmpeg to extract thumbnail at 5-second mark; updates `thumbnail_path` on success.

#### `PATCH /api/tracks/:id`
**Auth required:** Yes
**Body:** `{ "title"?, "artist"?, "genre"?, "language"? }` (all optional)
**Success 200:** Updated track object
**Failure 404:** `{ "error": "Track not found" }`

#### `DELETE /api/tracks/:id`
**Auth required:** Yes
**Success 200:** `{ "ok": true }`
**Failure 404:** `{ "error": "Track not found" }`
**Behaviour:** Deletes DB record (cascades to likes and comments). Deletes video, lrc, and thumbnail files from disk.

---

### 5.3 Search

#### `GET /api/search`
**Query params:** `q` (string, required), `page` (int, default 1), `limit` (int, default 20)
**Success 200:**
```json
{
  "results": [ /* same track object shape */ ],
  "total": 5,
  "query": "bts"
}
```
**Behaviour:** Sanitizes `q` (strips FTS5 special chars), wraps in double-quotes, runs FTS5 MATCH query ordered by `rank`. Returns empty results (not 404) if no matches.

---

### 5.4 Likes

#### `GET /api/tracks/:id/like`
**Success 200:** `{ "liked": false, "count": 42 }`
**Behaviour:** Checks if current `req.sessionID` has a like record for this track.

#### `POST /api/tracks/:id/like`
**Success 200:** `{ "liked": true, "count": 43 }` or `{ "liked": false, "count": 42 }`
**Behaviour:** Toggle. Attempts INSERT OR IGNORE. If 0 rows changed, deletes existing like instead. Returns updated state.

---

### 5.5 Comments

#### `GET /api/tracks/:id/comments`
**Query params:** `page` (default 1), `limit` (default 20)
**Success 200:**
```json
{
  "comments": [
    { "id": 1, "name": "Sean", "content": "Amazing!", "created_at": "2026-02-27T10:00:00" }
  ],
  "total": 5
}
```
**Ordering:** Newest first.

#### `POST /api/tracks/:id/comments`
**Body:** `{ "name": string, "content": string }`
**Validation:** name ≤ 50 chars, content ≤ 1000 chars, both required
**Success 201:** Created comment object
**Failure 400:** `{ "error": "..." }`

#### `DELETE /api/comments/:id`
**Auth required:** Yes
**Success 200:** `{ "ok": true }`
**Failure 404:** `{ "error": "Comment not found" }`

---

## 6. Pages & Routing

| URL                 | File                     | Auth   | Description              |
|---------------------|--------------------------|--------|--------------------------|
| `/`                 | `public/index.html`      | —      | Home / discovery feed    |
| `/track.html?id=X`  | `public/track.html`      | —      | Track player             |
| `/search.html?q=X`  | `public/search.html`     | —      | Search results           |
| `/login.html`       | `public/login.html`      | —      | Admin login              |
| `/upload.html`      | `public/upload.html`     | Admin  | Upload new track         |
| `/admin.html`       | `public/admin.html`      | Admin  | Track management dashboard|

Non-admin pages check `GET /api/admin/me` on load to conditionally show/hide admin nav links.
Admin pages redirect to `/login.html` if `isAdmin` is false.

---

## 7. Page Functional Requirements

### 7.1 Home Page (`index.html`)

**On load:**
- Fetch `GET /api/admin/me` → show Upload + Dashboard links if admin
- Fetch `GET /api/tracks?page=1&limit=20` → render track grid

**Filters (persistent in URL params):**
- Genre pills: All | K-Pop | Pop | R&B | Rock | Ballad | Jazz
- Language pills: All | Korean | English | Japanese | Chinese
- Sort: Newest | Most Viewed

**Behaviour:**
- Changing any filter resets to page 1 and re-fetches
- IntersectionObserver on bottom sentinel element triggers page increment and appends cards
- Each card links to `/track.html?id={id}`
- Skeleton loaders shown while fetching

**Track card displays:** thumbnail, title, artist, view count, relative time

---

### 7.2 Track Player (`track.html`)

**On load (extract `id` from `?id=` URL param):**
1. `GET /api/tracks/:id` → populate video src, title, artist, metadata
2. `GET /api/tracks/:id/like` → set initial heart state and count
3. `GET /api/tracks/:id/comments?page=1` → render comment list
4. If `lrc_path` present: fetch `/uploads/lrc/{lrc_path}` → parse with lrc-parser → build lyrics panel

**LRC Sync Engine:**
- Attach to `video.timeupdate` event
- Binary search `lrcLines[]` for last entry with `time ≤ video.currentTime`
- Toggle `.active` class on matching `.lrc-line` element
- Smooth-scroll active line to centre of lyrics panel
- Active line style: amber (#fbbf24), larger font, glow text-shadow

**Layout — Desktop (≥ 1024px):**
```
[  Video (70%)  ][  LRC Lyrics Panel (30%, scrollable)  ]
[ Title | Artist | Genre | Language | Views ]
[ ❤ Like button ]  [ Theater Mode toggle ]
[ Comments section ]
```

**Layout — Mobile:**
```
[ Video (full width) ]
[ Title | Artist ]
[ ❤ Like ]
[ 3-line rolling lyrics: prev (gray) / ACTIVE (amber) / next (gray) ]
[ Comments ]
```

**Theater mode:** Hides lyrics panel, expands video to full width.

**Like button:** Calls `POST /api/tracks/:id/like`, updates icon and count optimistically.

**Comment form:** `name` text input + `content` textarea + Post button. On submit: `POST /api/tracks/:id/comments`, prepend new comment to list on success.

---

### 7.3 Search Page (`search.html`)

**On load:**
- Read `q` from URL param, pre-fill search input
- Fetch `GET /api/search?q={q}` → render track grid
- Show "X results for '{q}'"
- Show empty state if 0 results

**Behaviour:**
- Form submit updates URL via `history.pushState`, re-fetches
- Same card grid component as home page

---

### 7.4 Admin Login (`login.html`)

**Behaviour:**
- On load: if already admin (`GET /api/admin/me`), redirect to `/admin.html`
- Form submit: `POST /api/admin/login`
- On success: redirect to `/admin.html`
- On failure: show error message inline

---

### 7.5 Upload Page (`upload.html`)

**On load:** Redirect to `/login.html` if not admin.

**Form fields:**
- Video file drop zone (MP4/WebM, max 2 GB)
- LRC file drop zone (optional, .lrc)
- Title (required)
- Artist (required)
- Genre (select)
- Language (select)

**Upload behaviour:**
- Client-side validation: file type, required fields
- XHR `POST /api/tracks` with FormData
- Upload progress bar via `xhr.upload.onprogress`
- On success: show link to new track page + "Upload another" button
- On failure: show error message, keep form state

---

### 7.6 Admin Dashboard (`admin.html`)

**On load:** Redirect to `/login.html` if not admin.

**Stats bar:** Total tracks | Total views | Total likes | Total comments

**Track table columns:** Thumbnail | Title | Artist | Genre | Language | Views | Likes | Date | Actions

**Actions per row:**
- **Edit:** Replaces row cells with input fields inline. Save button sends `PATCH /api/tracks/:id`. Cancel restores read view.
- **Delete:** Confirm dialog → `DELETE /api/tracks/:id` → removes row from table

**Comment moderation:** Link per track to view and delete individual comments.

**Logout button:** Calls `POST /api/admin/logout`, redirects to `/`.

---

## 8. File Storage

| Type      | Directory             | Naming                           |
|-----------|-----------------------|----------------------------------|
| Videos    | `/uploads/videos/`    | `{timestamp}-{random}.{ext}`     |
| LRC files | `/uploads/lrc/`       | `{timestamp}-{random}.lrc`       |
| Thumbnails| `/uploads/thumbnails/`| `{timestamp}-{random}.jpg`       |

Served publicly at `/uploads/*` via Express static middleware.
Files are deleted from disk when the parent track is deleted.

---

## 9. LRC File Format

Standard LRC format with timestamp per line:

```
[ti:Song Title]
[ar:Artist Name]
[00:00.00]
[00:05.23]First line of lyrics
[00:09.14]Second line of lyrics
[00:13.50]Third line of lyrics
```

**Parser rules:**
- Lines matching `/^\[(\d{2}):(\d{2})\.(\d{2,3})\](.+)$/` are parsed as lyric lines
- Metadata tags (e.g., `[ti:]`, `[ar:]`) are skipped
- Output: `[{ time: Number (seconds), text: String }]` sorted ascending
- Empty text lines filtered out
- If no LRC uploaded: lyrics panel shows "No lyrics available"

---

## 10. Security Requirements

| Concern              | Implementation                                                  |
|----------------------|-----------------------------------------------------------------|
| Password storage     | bcryptjs, cost factor 12, hash stored in `.env`                |
| Session security     | `httpOnly: true`, `sameSite: 'lax'`, 7-day expiry             |
| Session fixation     | `req.session.regenerate()` called before setting `isAdmin`     |
| XSS                  | User content rendered via `textContent`, never `innerHTML`     |
| File upload safety   | MIME type validation; server-generated filenames; served from `/uploads/`, not webroot |
| FTS5 injection       | User query sanitized and wrapped in double-quotes before MATCH |
| Admin route guarding | `requireAdmin` middleware on all admin-only routes             |

---

## 11. Non-Functional Requirements

| Requirement        | Target                                         |
|--------------------|------------------------------------------------|
| Page load          | < 2 seconds on broadband                       |
| LRC sync accuracy  | Within 200ms of actual timestamp               |
| Upload file size   | Up to 2 GB per video                           |
| Browser support    | Chrome, Firefox, Safari, Edge (latest 2 versions) |
| Mobile             | Fully responsive, tested at 375px width        |
| Uptime             | Single process; restart with `systemd` or `pm2`|

---

## 12. Environment Variables (`.env`)

| Variable              | Description                              |
|-----------------------|------------------------------------------|
| `PORT`                | Server port (default 3000)               |
| `SESSION_SECRET`      | Random string for session signing        |
| `ADMIN_USERNAME`      | Admin login username                     |
| `ADMIN_PASSWORD_HASH` | bcryptjs hash of admin password          |

---

## 13. Out of Scope (MVP)

- Public user registration
- Duet / recording mode
- Live streaming
- Email notifications
- Pitch scoring
- Mobile native apps
- CDN / cloud storage
- HTTPS (handled at reverse proxy level)
