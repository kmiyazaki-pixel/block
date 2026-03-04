require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dns = require('dns');

// Node.jsの最新仕様によるDNSの詰まりを解消（IPv4優先）
dns.setDefaultResultOrder('ipv4first');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// --- 1. MongoDB Atlas に接続（非SRV・3ホスト直指定） ---
const MONGO_URL = process.env.MONGO_URL;

mongoose.connect(MONGO_URL, {
  serverSelectionTimeoutMS: 15000,
  family: 4,
})
  .then(() => console.log('✅ MongoDB接続成功！ついに、ついに突破しました！'))
  .catch(err => {
    console.error('❌ 接続失敗。以下の内容を教えてください:');
    console.error(err.message);
  });

// --- 2. スコアの形（スキーマ） ---
const scoreSchema = new mongoose.Schema({
  name: { type: String, required: true },
  score: { type: Number, required: true },
  date: { type: Date, default: Date.now }
});
const Score = mongoose.model('Score', scoreSchema);

// --- 3. API：ランキング取得 (TOP 5) ---
app.get('/api/ranking', async (req, res) => {
  try {
    const topScores = await Score.find()
      .sort({ score: -1, date: 1 }) // 同点なら古い方を上に（好みで変えてOK）
      .limit(5);
    res.json(topScores);
  } catch (err) {
    res.status(500).json({ error: "取得失敗" });
  }
});

// --- 4. API：スコア保存（同じ名前は自己ベストだけ残す） ---
app.post('/api/save-score', async (req, res) => {
  try {
    let { name, score } = req.body;

    // 最低限のチェック
    if (typeof name !== 'string') name = "PLAYER";
    if (!Number.isFinite(score)) score = 0;

    name = name.trim().slice(0, 10) || "PLAYER";
    score = Math.max(0, Math.floor(score));

    // 同名があれば「高い時だけ更新」、なければ新規作成
    await Score.findOneAndUpdate(
      { name },
      { $max: { score }, $set: { date: new Date() } },
      { upsert: true, new: true }
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "保存失敗" });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 サーバー起動中: http://localhost:${PORT}`);
});
