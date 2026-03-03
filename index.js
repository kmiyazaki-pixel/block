const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// --- 1. MongoDB Atlas に接続 ---
// 社長の接続文字列をここにセット
const MONGO_URL = "mongodb+srv://kmiyazaki_db_user:vhHqN1AMSIoXVwhS@blockranking.xgtpuc8.mongodb.net/RankingDB?retryWrites=true&w=majority&appName=BlockRanking";

mongoose.connect(MONGO_URL)
    .then(() => console.log('✅ MongoDB接続成功！'))
    .catch(err => console.error('❌ 接続失敗:', err));

// --- 2. スコアの形を決める ---
const scoreSchema = new mongoose.Schema({
    name: { type: String, required: true },
    score: { type: Number, required: true },
    date: { type: Date, default: Date.now }
});
const Score = mongoose.model('Score', scoreSchema);

// --- 3. API：ランキング取得 (TOP 5) ---
app.get('/api/ranking', async (req, res) => {
    try {
        const topScores = await Score.find().sort({ score: -1 }).limit(5);
        res.json(topScores);
    } catch (err) {
        res.status(500).json({ error: "取得失敗" });
    }
});

// --- 4. API：スコア保存 ---
app.post('/api/save-score', async (req, res) => {
    try {
        const newScore = new Score(req.body);
        await newScore.save();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "保存失敗" });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 サーバー起動中: http://localhost:${PORT}`);
});
