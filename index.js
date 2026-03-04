const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dns = require('dns');

// 【重要】Node.jsの通信ルールをIPv4優先にするおまじない
dns.setDefaultResultOrder('ipv4first');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// --- 1. MongoDB Atlas に接続 (srvを使わない「最短ルート」の接続形式) ---
// 社長のクラスター専用の「直接の住所」を3本並べた形式です。これでDNSエラーを回避します。
const MONGO_URL = "mongodb://kmiyazaki_db_user:vhHqN1AMSIoXVwhS@ac-bptp15z-shard-00-00.xgtpuc8.mongodb.net:27017,ac-bptp15z-shard-00-01.xgtpuc8.mongodb.net:27017,ac-bptp15z-shard-00-02.xgtpuc8.mongodb.net:27017/RankingDB?ssl=true&replicaSet=atlas-2y4p74-shard-0&authSource=admin&retryWrites=true&w=majority";

mongoose.connect(MONGO_URL)
    .then(() => console.log('✅ MongoDB接続成功！ついに、ついに突破しました！'))
    .catch(err => {
        console.error('❌ 接続失敗。以下の内容を教えてください:');
        console.error(err.message);
    });

// --- 2. スコアの形（スキーマ）を決める ---
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
