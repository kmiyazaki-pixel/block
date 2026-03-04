require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dns = require('dns');

dns.setDefaultResultOrder('ipv4first');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS：GitHub Pages からのアクセスを許可（必要なら自分のURLに変更）
app.use(cors({
  origin: ['https://kmiyazaki-pixel.github.io'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
}));

app.use(express.json());

// --- 動作確認用（これが返ればサーバーは動いてる） ---
app.get('/', (req, res) => res.send('OK: API is running'));
app.get('/health', (req, res) => res.json({ ok: true }));

// --- MongoDB接続（try/catchなしで括弧ミスを減らす） ---
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

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
