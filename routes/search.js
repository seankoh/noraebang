const express = require('express');
const db = require('../db');

const router = express.Router();

router.get('/', (req, res) => {
  const q = (req.query.q || '').trim();
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
  const offset = (page - 1) * limit;

  if (!q) return res.json({ results: [], total: 0, query: q });

  // Sanitize: strip FTS5 special chars, wrap in quotes
  const safe = '"' + q.replace(/["*()]/g, ' ') + '"';

  try {
    const results = db.prepare(`
      SELECT t.*, COUNT(DISTINCT l.id) AS like_count
      FROM tracks t
      JOIN tracks_fts f ON t.id = f.rowid
      LEFT JOIN likes l ON l.track_id = t.id
      WHERE f MATCH ?
      GROUP BY t.id
      ORDER BY rank
      LIMIT ? OFFSET ?
    `).all(safe, limit, offset);

    const { total } = db.prepare(`
      SELECT COUNT(*) AS total FROM tracks_fts WHERE tracks_fts MATCH ?
    `).get(safe);

    res.json({ results, total, query: q });
  } catch {
    res.json({ results: [], total: 0, query: q });
  }
});

module.exports = router;
