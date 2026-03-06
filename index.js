require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dns = require('dns');

dns.setDefaultResultOrder('ipv4first');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: ['https://kmiyazaki-pixel.github.io'],
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

app.get('/', (req, res) => res.send('OK: API is running'));
app.get('/health', (req, res) => res.json({ ok: true }));

function requireAdmin(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  const expected = (process.env.ADMIN_TOKEN || '').trim();

  if (!expected) return res.status(500).json({ error: 'server not configured' });
  if (token !== expected) return res.status(401).json({ error: 'unauthorized' });

  next();
}

app.get('/api/admin/check', requireAdmin, (req, res) => {
  res.json({ ok: true });
});

const MONGO_URL = process.env.MONGO_URL;
if (!MONGO_URL) console.error('❌ MONGO_URL is missing');

mongoose.connect(MONGO_URL, { serverSelectionTimeoutMS: 15000, family: 4 })
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => console.error('❌ MongoDB connection error:', err));

const scoreSchema = new mongoose.Schema({
  name: { type: String, required: true },
  score: { type: Number, required: true },
  date: { type: Date, default: Date.now }
});
const Score = mongoose.model('Score', scoreSchema);

// 通常はTOP5、?all=1 なら全件（最大500件）
app.get('/api/ranking', async (req, res) => {
  try {
    const all = String(req.query.all || '') === '1';
    const limit = all ? 500 : 5;

    const scores = await Score.find()
      .sort({ score: -1, date: 1 })
      .limit(limit);

    res.json(scores);
  } catch (err) {
    console.error('❌ /api/ranking error:', err);
    res.status(500).json({ error: '取得失敗' });
  }
});

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

app.get('/api/admin/scores', requireAdmin, async (req, res) => {
  try {
    const list = await Score.find()
      .sort({ score: -1, date: 1 })
      .limit(100);
    res.json(list);
  } catch (err) {
    console.error('❌ admin list error:', err);
    res.status(500).json({ error: 'list failed' });
  }
});

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

app.delete('/api/admin/score/:id', requireAdmin, async (req, res) => {
  try {
    const id = String(req.params.id || '').trim();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'invalid id' });
    }

    const result = await Score.deleteOne({ _id: id });
    res.json({ success: true, deletedCount: result.deletedCount });
  } catch (err) {
    console.error('❌ delete by id error:', err);
    res.status(500).json({ error: 'delete failed' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
