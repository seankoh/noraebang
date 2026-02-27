const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Multer storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'video') cb(null, path.join(__dirname, '../uploads/videos'));
    else if (file.fieldname === 'lrc') cb(null, path.join(__dirname, '../uploads/lrc'));
    else cb(new Error('Unknown field'), null);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname).toLowerCase());
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 * 1024 }, // 2 GB
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'video') {
      cb(null, ['video/mp4', 'video/webm', 'video/quicktime'].includes(file.mimetype));
    } else if (file.fieldname === 'lrc') {
      cb(null, true); // Accept any text file for LRC
    } else {
      cb(null, false);
    }
  }
});

// Extract thumbnail using ffmpeg (async, non-blocking)
function extractThumbnail(videoPath, trackId) {
  try {
    const ffmpeg = require('fluent-ffmpeg');
    const thumbName = path.basename(videoPath, path.extname(videoPath)) + '-thumb.jpg';
    const thumbPath = path.join(__dirname, '../uploads/thumbnails', thumbName);

    ffmpeg(videoPath)
      .screenshots({ timestamps: ['00:00:05'], filename: thumbName, folder: path.join(__dirname, '../uploads/thumbnails'), size: '640x360' })
      .on('end', () => {
        db.prepare('UPDATE tracks SET thumbnail_path = ? WHERE id = ?').run(thumbName, trackId);
      })
      .on('error', () => {}); // Silently fail — thumbnail is optional
  } catch {
    // ffmpeg not available, skip thumbnail
  }
}

// GET /api/tracks
router.get('/', (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
  const offset = (page - 1) * limit;
  const genre = req.query.genre || null;
  const language = req.query.language || null;
  const sort = req.query.sort === 'views' ? 'views' : 'newest';

  const orderBy = sort === 'views' ? 't.views DESC' : 't.created_at DESC';

  const tracks = db.prepare(`
    SELECT t.*, COUNT(DISTINCT l.id) AS like_count
    FROM tracks t
    LEFT JOIN likes l ON l.track_id = t.id
    WHERE (? IS NULL OR t.genre = ?)
      AND (? IS NULL OR t.language = ?)
    GROUP BY t.id
    ORDER BY ${orderBy}
    LIMIT ? OFFSET ?
  `).all(genre, genre, language, language, limit, offset);

  const { total } = db.prepare(`
    SELECT COUNT(*) AS total FROM tracks
    WHERE (? IS NULL OR genre = ?)
      AND (? IS NULL OR language = ?)
  `).get(genre, genre, language, language);

  res.json({ tracks, total, page, limit });
});

// GET /api/tracks/:id
router.get('/:id', (req, res) => {
  const id = parseInt(req.params.id);

  const track = db.prepare('SELECT * FROM tracks WHERE id = ?').get(id);
  if (!track) return res.status(404).json({ error: 'Track not found' });

  // Increment views
  db.prepare('UPDATE tracks SET views = views + 1 WHERE id = ?').run(id);
  track.views += 1;

  const { like_count } = db.prepare(
    'SELECT COUNT(*) AS like_count FROM likes WHERE track_id = ?'
  ).get(id);

  res.json({ ...track, like_count });
});

// POST /api/tracks (admin only)
router.post('/', requireAdmin, upload.fields([{ name: 'video', maxCount: 1 }, { name: 'lrc', maxCount: 1 }]), (req, res) => {
  const { title, artist, genre, language } = req.body;

  if (!title || !artist) {
    return res.status(400).json({ error: 'Title and artist are required' });
  }

  const videoFile = req.files?.video?.[0];
  const lrcFile = req.files?.lrc?.[0];

  if (!videoFile) {
    return res.status(400).json({ error: 'Video file is required' });
  }

  const result = db.prepare(`
    INSERT INTO tracks (title, artist, genre, language, video_path, lrc_path)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    title.trim(),
    artist.trim(),
    genre?.trim() || null,
    language?.trim() || null,
    videoFile.filename,
    lrcFile?.filename || null
  );

  const track = db.prepare('SELECT * FROM tracks WHERE id = ?').get(result.lastInsertRowid);

  // Extract thumbnail async (non-blocking)
  extractThumbnail(videoFile.path, track.id);

  res.status(201).json(track);
});

// PATCH /api/tracks/:id (admin only)
router.patch('/:id', requireAdmin, (req, res) => {
  const id = parseInt(req.params.id);
  const track = db.prepare('SELECT * FROM tracks WHERE id = ?').get(id);
  if (!track) return res.status(404).json({ error: 'Track not found' });

  const { title, artist, genre, language } = req.body;

  db.prepare(`
    UPDATE tracks SET
      title    = COALESCE(?, title),
      artist   = COALESCE(?, artist),
      genre    = COALESCE(?, genre),
      language = COALESCE(?, language)
    WHERE id = ?
  `).run(title || null, artist || null, genre || null, language || null, id);

  const updated = db.prepare('SELECT * FROM tracks WHERE id = ?').get(id);
  res.json(updated);
});

// DELETE /api/tracks/:id (admin only)
router.delete('/:id', requireAdmin, (req, res) => {
  const id = parseInt(req.params.id);
  const track = db.prepare('SELECT * FROM tracks WHERE id = ?').get(id);
  if (!track) return res.status(404).json({ error: 'Track not found' });

  db.prepare('DELETE FROM tracks WHERE id = ?').run(id);

  // Clean up files
  const toDelete = [
    track.video_path ? path.join(__dirname, '../uploads/videos', track.video_path) : null,
    track.lrc_path ? path.join(__dirname, '../uploads/lrc', track.lrc_path) : null,
    track.thumbnail_path ? path.join(__dirname, '../uploads/thumbnails', track.thumbnail_path) : null,
  ].filter(Boolean);

  toDelete.forEach(p => fs.unlink(p, () => {}));

  res.json({ ok: true });
});

module.exports = router;
