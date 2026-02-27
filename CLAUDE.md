# Noraebang — Claude Code Guide

## Project Overview
YouTube-style karaoke web app. Single admin manages all tracks. Visitors browse, like, and comment without accounts.

## Tech Stack
- **Runtime:** Node.js 20 (installed via nvm at `~/.nvm`)
- **Backend:** Express.js (`server.js`)
- **Database:** SQLite via `better-sqlite3` (`db.js` → `noraebang.db`)
- **Auth:** `express-session` + `bcryptjs` (single admin account)
- **Uploads:** `multer` → `/uploads/videos/`, `/uploads/lrc/`, `/uploads/thumbnails/`
- **Frontend:** Vanilla HTML/CSS/JS + Tailwind CDN (no build step)

## Running the App
```bash
# Always load nvm first
export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh"

# Dev server (auto-restart)
npm run dev

# Production
npm start
```
Server runs at http://localhost:3000

## Admin Setup (first time)
```bash
export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh"
npm run hash-password   # Enter password, copy hash
# Paste hash into .env as ADMIN_PASSWORD_HASH
```

## Environment Variables (`.env`)
```
PORT=3000
SESSION_SECRET=<random string>
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=<bcrypt hash>
```

## Key Files
| File | Purpose |
|------|---------|
| `server.js` | Express app, session config, route mounting |
| `db.js` | SQLite schema init, FTS5 virtual table |
| `middleware/auth.js` | `requireAdmin` middleware |
| `routes/admin.js` | Login, logout, /me |
| `routes/tracks.js` | Track CRUD + multer upload |
| `routes/search.js` | FTS5 full-text search |
| `routes/likes.js` | Session-based like toggle |
| `routes/comments.js` | Open comments |
| `public/js/lrc-parser.js` | LRC file parser (pure function) |
| `public/js/player.js` | Video player + LRC sync engine |

## Project Structure
```
noraebang/
├── server.js
├── db.js
├── .env
├── middleware/auth.js
├── routes/{admin,tracks,search,likes,comments}.js
├── uploads/{videos,lrc,thumbnails}/
└── public/
    ├── index.html        # Home feed
    ├── track.html        # Player
    ├── search.html       # Search
    ├── login.html        # Admin login
    ├── upload.html       # Admin upload
    ├── admin.html        # Admin dashboard
    └── js/{api,lrc-parser,player,home,search,login,upload,admin}.js
```

## API Routes
| Method | Path | Auth |
|--------|------|------|
| POST | /api/admin/login | — |
| POST | /api/admin/logout | admin |
| GET | /api/admin/me | — |
| GET | /api/tracks | — |
| GET | /api/tracks/:id | — |
| POST | /api/tracks | admin |
| PATCH | /api/tracks/:id | admin |
| DELETE | /api/tracks/:id | admin |
| GET | /api/search?q= | — |
| GET/POST | /api/tracks/:id/like | — |
| GET/POST | /api/tracks/:id/comments | — |
| DELETE | /api/comments/:id | admin |

## Notes
- `better-sqlite3` is synchronous — no async/await needed for DB calls
- Thumbnail extraction via ffmpeg runs async after track creation; thumbnail is optional
- Session IDs used for likes (no login required)
- All user content rendered with `textContent` (never `innerHTML`) to prevent XSS
- LRC sync uses binary search on `timeupdate` event for efficiency
