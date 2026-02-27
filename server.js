require('dotenv').config();
const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session
app.use(session({
  store: new SQLiteStore({ db: 'sessions.db', dir: __dirname }),
  secret: process.env.SESSION_SECRET || 'fallback_secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  }
}));

// Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API routes
app.use('/api/admin', require('./routes/admin'));
app.use('/api/tracks', require('./routes/tracks'));
app.use('/api/search', require('./routes/search'));
app.use('/api/tracks', require('./routes/likes'));
app.use('/api/tracks', require('./routes/comments'));
app.use('/api/comments', require('./routes/comments'));

// Fallback: serve index.html for non-API routes without a file extension
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  const file = req.path === '/' ? 'index.html' : req.path.replace(/^\//, '');
  const fullPath = path.join(__dirname, 'public', file);
  res.sendFile(fullPath, err => {
    if (err) res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });
});

app.listen(PORT, () => {
  console.log(`Noraebang running at http://localhost:${PORT}`);
});
