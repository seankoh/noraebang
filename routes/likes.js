const express = require('express');
const db = require('../db');

const router = express.Router();

router.get('/:id/like', (req, res) => {
  const trackId = parseInt(req.params.id);
  const sessionId = req.sessionID;

  const track = db.prepare('SELECT id FROM tracks WHERE id = ?').get(trackId);
  if (!track) return res.status(404).json({ error: 'Track not found' });

  const liked = !!db.prepare(
    'SELECT 1 FROM likes WHERE track_id = ? AND session_id = ?'
  ).get(trackId, sessionId);

  const { count } = db.prepare(
    'SELECT COUNT(*) AS count FROM likes WHERE track_id = ?'
  ).get(trackId);

  res.json({ liked, count });
});

router.post('/:id/like', (req, res) => {
  const trackId = parseInt(req.params.id);
  const sessionId = req.sessionID;

  const track = db.prepare('SELECT id FROM tracks WHERE id = ?').get(trackId);
  if (!track) return res.status(404).json({ error: 'Track not found' });

  const result = db.prepare(
    'INSERT OR IGNORE INTO likes (track_id, session_id) VALUES (?, ?)'
  ).run(trackId, sessionId);

  let liked;
  if (result.changes === 0) {
    db.prepare('DELETE FROM likes WHERE track_id = ? AND session_id = ?').run(trackId, sessionId);
    liked = false;
  } else {
    liked = true;
  }

  const { count } = db.prepare(
    'SELECT COUNT(*) AS count FROM likes WHERE track_id = ?'
  ).get(trackId);

  res.json({ liked, count });
});

module.exports = router;
