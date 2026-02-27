const express = require('express');
const db = require('../db');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/tracks/:id/comments
router.get('/:id/comments', (req, res) => {
  const trackId = parseInt(req.params.id);
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
  const offset = (page - 1) * limit;

  const track = db.prepare('SELECT id FROM tracks WHERE id = ?').get(trackId);
  if (!track) return res.status(404).json({ error: 'Track not found' });

  const comments = db.prepare(`
    SELECT id, name, content, created_at
    FROM comments
    WHERE track_id = ?
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).all(trackId, limit, offset);

  const { total } = db.prepare(
    'SELECT COUNT(*) AS total FROM comments WHERE track_id = ?'
  ).get(trackId);

  res.json({ comments, total });
});

// POST /api/tracks/:id/comments
router.post('/:id/comments', (req, res) => {
  const trackId = parseInt(req.params.id);
  const { name, content } = req.body;

  if (!name || !content) return res.status(400).json({ error: 'Name and content are required' });
  if (name.length > 50) return res.status(400).json({ error: 'Name must be 50 characters or less' });
  if (content.length > 1000) return res.status(400).json({ error: 'Comment must be 1000 characters or less' });

  const track = db.prepare('SELECT id FROM tracks WHERE id = ?').get(trackId);
  if (!track) return res.status(404).json({ error: 'Track not found' });

  const result = db.prepare(
    'INSERT INTO comments (track_id, name, content) VALUES (?, ?, ?)'
  ).run(trackId, name.trim(), content.trim());

  const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(comment);
});

// DELETE /api/comments/:id  (admin only — mounted separately)
router.delete('/:id', requireAdmin, (req, res) => {
  const id = parseInt(req.params.id);
  const result = db.prepare('DELETE FROM comments WHERE id = ?').run(id);
  if (result.changes === 0) return res.status(404).json({ error: 'Comment not found' });
  res.json({ ok: true });
});

module.exports = router;
