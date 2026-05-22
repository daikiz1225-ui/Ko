const express = require('express');
const path = require('path');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

// 容量制限の拡張（wallpaper.jsなどの大容量データ用）
app.use(express.json({ limit: '4mb' })); 
app.use(express.urlencoded({ extended: true, limit: '4mb' }));

// フロントエンドファイル（HTML/CSS/JS）をいつも通りそのまま配信する設定
app.use(express.static(__dirname));

// Edge Runtime (reqのみ受け取るファイル) 用の互換ラッパー
async function handleEdge(handler, req, res) {
    try {
        const protocol = req.protocol;
        const host = req.get('host');
        const fullUrl = `${protocol}://${host}${req.originalUrl}`;
        
        const webReq = {
            url: fullUrl,
            method: req.method,
            headers: new Headers(req.headers),
            body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : null,
            searchParams: new URL(fullUrl).searchParams
        };

        const webRes = await handler(webReq);

        // リダイレクト処理 (streaming.js用)
        if (webRes.status === 302 || webRes.status === 301) {
            const redirectUrl = webRes.headers.get('Location');
            if (redirectUrl) {
                return res.redirect(webRes.status, redirectUrl);
            }
        }

        // 通常レスポンス処理
        res.status(webRes.status || 200);
        webRes.headers.forEach((value, key) => {
            res.setHeader(key, value);
        });

        const bodyText = await webRes.text();
        res.send(bodyText);
    } catch (error) {
        console.error("Edge関数実行エラー:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

// ==========================================
// 🗺️ ルーティング設定（バックエンドファイルの紐付け）
// ==========================================

// --- パターン1: Edge Runtime形式 (引数がreqのみ) ---
const kanrennHandler = require('./kanrenn.js').default;
app.all('/api/kanrenn', (req, res) => handleEdge(kanrennHandler, req, res));

const aiRecommendHandler = require('./ai_recommend.js').default;
app.all('/api/ai_recommend', (req, res) => handleEdge(aiRecommendHandler, req, res));

const streamingHandler = require('./streaming.js').default;
app.all('/api/streaming', (req, res) => handleEdge(streamingHandler, req, res));

// --- パターン2: Node.js形式 (引数がreq, res) ---
const komentoHandler = require('./komento.js');
app.all('/api/komento', (req, res) => komentoHandler(req, res));

const thumbHandler = require('./thumb.js');
app.all('/api/thumb', (req, res) => thumbHandler(req, res));

const m3u8Handler = require('./m3u8.js').default || require('./m3u8.js');
app.all('/api/m3u8', (req, res) => m3u8Handler(req, res));

const authHandler = require('./auth.js').default || require('./auth.js');
app.all('/api/auth', (req, res) => authHandler(req, res));

const syncHandler = require('./sync.js').default || require('./sync.js');
app.all('/api/sync', (req, res) => syncHandler(req, res));

const wallpaperHandler = require('./wallpaper.js').default || require('./wallpaper.js');
app.all('/api/wallpaper', (req, res) => wallpaperHandler(req, res));

// --- パターン3: Python(get_key.py)のNode.js完全シミュレート ---
app.get('/api/get_key', async (req, res) => {
    try {
        const response = await fetch('https://apis.kahoot.it/media-api/youtube/key', { timeout: 10000 });
        const data = await response.json();
        
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET');
        res.setHeader('Content-Type', 'application/json');
        
        res.status(200).json(data);
    } catch (error) {
        res.status(500).send(error.message);
    }
});

// サーバー起動
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
