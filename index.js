// index.js（管理者削除API入り 完成版 / Render向け）
// ※ デバッグログ（Authorizationが届いてるか）入り：原因切り分け用
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dns = require('dns');

dns.setDefaultResultOrder('ipv4first');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS: GitHub Pages からのアクセスを許可（必要なら自分のURLに変更）
app.use(cors({
  origin: ['https://kmiyazaki-pixel.github.io'],
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

// --- 動作確認 ---
app.get('/', (req, res) => res.send('OK: API is running'));
app.get('/health', (req, res) => res.json({ ok: true }));

// --- 管理者認証（Bearerトークン）---
function requireAdmin(req, res, next) {
  // デバッグ（トークン文字列そのものは出さない）
  console.log('ADMIN_TOKEN set?', !!process.env.ADMIN_TOKEN);
  console.log('AUTH header present?', !!req.headers.authorization);
  console.log('AUTH header starts Bearer?', (req.headers.authorization || '').startsWith('Bearer '));

  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';

  if (!process.env.ADMIN_TOKEN) {
    console.error('❌ ADMIN_TOKEN is missing in env');
    return res.status(500).json({ error: 'server not configured' });
  }

  if (token !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  next();
}

// --- MongoDB接続 ---
const MONGO_URL = process.env.MONGO_URL;
if (!MONGO_URL) {
  console.error('❌ MONGO_URL is missing in environment variables');
}

mongoose.connect(MONGO_URL, {
  serverSelectionTimeoutMS: 15000,
  family: 4,
})
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => console.error('❌ MongoDB connection error:', err));

// --- Schema ---
const scoreSchema = new mongoose.Schema({
  name: { type: String, required: true },
  score: { type: Number, required: true },
  date: { type: Date, default: Date.now }
});

const Score = mongoose.model('Score', scoreSchema);

// --- API: ranking ---
app.get('/api/ranking', async (req, res) => {
  try {
    const topScores = await Score.find()
      .sort({ score: -1, date: 1 })
      .limit(5);

    res.json(topScores);
  } catch (err) {
    console.error('❌ /api/ranking error:', err);
    res.status(500).json({ error: '取得失敗' });
  }
});

// --- API: save score (same name keeps best) ---
app.post('/api/save-score', async (req, res) => {
  try {
    let { name, score } = req.body;

    if (typeof name !== 'string') name = 'PLAYER';
    if (!Number.isFinite(score)) score = 0;

    name = name.trim().slice(0, 10) || 'PLAYER';
    score = Math.max(0, Math.floor(score));

    await Score.findOneAndUpdate(
      { name },
      { $max: { score }, $set: { date: new Date() } },
      { upsert: true, new: true }
    );

    res.json({ success: true });
  } catch (err) {
    console.error('❌ /api/save-score error:', err);
    res.status(500).json({ error: '保存失敗' });
  }
});

// --- ADMIN: delete all scores（確認付き）---
// 例: DELETE /api/admin/scores?confirm=YES
app.delete('/api/admin/scores', requireAdmin, async (req, res) => {
  try {
    if (req.query.confirm !== 'YES') {
      return res.status(400).json({ error: 'add ?confirm=YES' });
    }
    const result = await Score.deleteMany({});
    res.json({ success: true, deletedCount: result.deletedCount });
  } catch (err) {
    console.error('❌ delete all error:', err);
    res.status(500).json({ error: 'delete failed' });
  }
});

// --- ADMIN: delete by name ---
app.delete('/api/admin/scores/:name', requireAdmin, async (req, res) => {
  try {
    const name = String(req.params.name || '').trim().slice(0, 10);
    const result = await Score.deleteMany({ name });
    res.json({ success: true, deletedCount: result.deletedCount });
  } catch (err) {
    console.error('❌ delete by name error:', err);
    res.status(500).json({ error: 'delete failed' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
