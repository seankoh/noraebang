# Noraebang Web App — Product Specification

## Overview

Noraebang (노래방) is a web-based karaoke platform inspired by the YouTube format. Users can browse, search, and sing along to karaoke tracks with synchronized lyrics (scrolling text), user-generated content, ratings, and social features. The name comes from the Korean word for "singing room."

---

## Goals

- Provide a YouTube-like experience for karaoke content
- Support synchronized scrolling lyrics during playback
- Allow users to record and upload their own karaoke performances
- Foster a community around singing and music discovery

---

## Target Audience

- Karaoke enthusiasts (casual and dedicated)
- Korean pop (K-Pop) fans and fans of international music
- Social singers who want to share performances online
- Mobile and desktop users

---

## Core Features

### 1. Home / Discovery Feed
- Trending karaoke tracks
- Personalized recommendations based on listening/singing history
- Category filters: K-Pop, Pop, R&B, Rock, Ballad, etc.
- Featured playlists and curated collections

### 2. Track Player
- Full-screen karaoke video player (YouTube embed or hosted video)
- Synchronized scrolling lyrics (line-by-line highlighting)
- Pitch guide / melody line display (optional toggle)
- Audio controls: volume, mic input level
- Key transpose controls (+/- semitones)
- Vocal removal toggle (if instrumental track available)
- Queue / up-next sidebar

### 3. Microphone & Recording
- In-browser microphone access via Web Audio API
- Real-time vocal mixing with the backing track
- Record and save performances locally or to cloud
- Upload recorded performance as a video/audio post

### 4. Search & Browse
- Search by song title, artist, language, genre
- Filter by: most viewed, highest rated, newest, language
- Auto-complete suggestions
- Trending searches section

### 5. User Accounts
- Sign up / log in (email + password)
- User profile page:
  - Display name, avatar, bio
  - Uploaded tracks
  - Liked tracks

### 6. Social
- Like and comment on tracks
- Share track link

### 7. Content Upload
- Upload backing track (video file or YouTube URL) with LRC lyrics file
- Metadata: title, artist, genre, language
- Stored locally on server filesystem

### 8. Playlists
- Create and manage personal playlists
- Add/remove tracks from playlist

---

## Technical Stack (Proposed)

| Layer         | Technology                              |
|---------------|-----------------------------------------|
| Frontend      | HTML, CSS, Vanilla JavaScript           |
| Styling       | Tailwind CSS (via CDN)                  |
| Video Player  | HTML5 `<video>` + YouTube iframe embed  |
| Audio         | Web Audio API (mic input)               |
| Lyrics Sync   | LRC parser + requestAnimationFrame      |
| Backend       | Node.js + Express                       |
| Database      | SQLite via better-sqlite3               |
| File Storage  | Local filesystem (`/uploads` folder)    |
| Auth          | express-session + bcrypt (email/password)|
| Search        | SQLite full-text search (FTS5)          |
| Deployment    | Single server / VPS (Node process)      |

---

## Pages & Routes

| Route                  | Description                          |
|------------------------|--------------------------------------|
| `/`                    | Home / Discovery feed                |
| `/search`              | Search results page                  |
| `/track/[id]`          | Track player page                    |
| `/upload`              | Upload new track or performance      |
| `/profile/[username]`  | User profile page                    |
| `/playlist/[id]`       | Playlist view and player             |
| `/trending`            | Trending tracks and performers       |
| `/login`               | Login / Sign up page                 |
| `/settings`            | Account and notification settings    |

---

## UI / UX Design Principles

- Dark-themed UI (concert/stage feel)
- Mobile-first, responsive layout
- Large video/player area centered on the page
- Lyrics displayed prominently below or over the video
- Minimal distractions during playback (theater mode)
- Fast load times with skeleton loaders and lazy loading

---

## Lyrics Format Support

| Format | Description                                  |
|--------|----------------------------------------------|
| LRC    | Standard karaoke timestamped lyrics format   |
| SRT    | Subtitle format with time ranges             |
| ASS    | Advanced subtitle format (styled lyrics)     |
| Plain  | Plain text (no sync, static display)         |

---

## Monetization (Future)

- Premium subscription: ad-free, unlimited recording, higher audio quality
- Virtual coins / gifting during live sessions
- Artist and label partnerships for official tracks
- Ad-supported free tier

---

## MVP Scope (Phase 1)

The minimum viable product will focus on:

1. User authentication (email + password)
2. Track listing and search
3. Track player with video and synchronized LRC lyrics
4. Mic input and basic recording
5. Upload track (video + LRC file)
6. User profile with uploaded tracks
7. Like and comment on tracks

---

## Out of Scope (Phase 1)

- Duet mode
- Live streaming
- Leaderboards
- Monetization
- Mobile native apps

---

## Non-Functional Requirements

- Page load time < 2 seconds on broadband
- Lyrics sync accuracy within 200ms
- Support for modern browsers (Chrome, Firefox, Safari, Edge)
- WCAG 2.1 AA accessibility compliance
- GDPR-compliant data handling

---

## Open Questions

- [ ] Will tracks be self-hosted or pulled from external sources (YouTube embeds)?
- [ ] What licensing model is used for copyrighted music?
- [ ] Is real-time pitch scoring (like Smule) a desired feature for MVP?
- [ ] Should there be a live streaming / live noraebang room feature?
- [ ] What languages should the UI support at launch (Korean + English)?
