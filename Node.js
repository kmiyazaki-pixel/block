// server.js (バックエンド抜粋)
const scores = []; // 本来はDBやファイルに保存

app.post('/api/save-score', (req, res) => {
    const { name, score } = req.body;
    scores.push({ name, score, date: new Date() });
    scores.sort((a, b) => b.score - a.score); // 降順ソート
    res.json({ success: true, ranking: scores.slice(0, 5) });
});

app.get('/api/ranking', (req, res) => {
    res.json(scores.slice(0, 5));
});
