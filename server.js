/* server.js - クリーン＆シンプル完全同期版 */
const express = require("express");
const path = require("path");
const fetch = require("node-fetch");

const app = express();
const PORT = process.env.PORT || 3000;

// 容量制限の拡張（wallpaper.jsなどの大容量データ用）
app.use(express.json({ limit: "4mb" }));
app.use(express.urlencoded({ extended: true, limit: "4mb" }));

// フロントエンドファイル（HTML/CSS/JS）をいつも通りそのまま配信する設定
app.use(express.static(__dirname));

// ==========================================
// 🗺️ ルーティング設定（ハイブリッドAPI群のダイレクト紐付け）
// ==========================================

// 1. 各APIモジュールを安全にインポート（.handler または本体を自動取得）
const kanrennModule = require("./kanrenn.js");
const kanrennHandler = kanrennModule.handler || kanrennModule;

const aiRecommendModule = require("./ai_recommend.js");
const aiRecommendHandler = aiRecommendModule.handler || aiRecommendModule;

const streamingModule = require("./streaming.js");
const streamingHandler = streamingModule.handler || streamingModule;

const m3u8Module = require("./m3u8.js");
const m3u8Handler = m3u8Module.handler || m3u8Module.default || m3u8Module;

const authModule = require("./auth.js");
const authHandler = authModule.handler || authModule.default || authModule;

const syncModule = require("./sync.js");
const syncHandler = syncModule.handler || syncModule.default || syncModule;

const wallpaperModule = require("./wallpaper.js");
const wallpaperHandler =
  wallpaperModule.handler || wallpaperModule.default || wallpaperModule;

// その他の既存API
const komentoHandler = require("./komento.js");
const thumbHandler = require("./thumb.js");

// 2. ルートへの割り当て（余計なラッパーを通さず、Expressハンドラーとして直結）
app.all("/api/kanrenn", (req, res) => kanrennHandler(req, res));
app.all("/api/ai_recommend", (req, res) => aiRecommendHandler(req, res));
app.all("/api/streaming", (req, res) => streamingHandler(req, res));
app.all("/api/m3u8", (req, res) => m3u8Handler(req, res));
app.all("/api/auth", (req, res) => authHandler(req, res));
app.all("/api/sync", (req, res) => syncHandler(req, res));
app.all("/api/wallpaper", (req, res) => wallpaperHandler(req, res));

app.all("/api/komento", (req, res) => komentoHandler(req, res));
app.all("/api/thumb", (req, res) => thumbHandler(req, res));

// --- Python(get_key.py)のNode.js完全シミュレート ---
app.get("/api/get_key", async (req, res) => {
  try {
    const response = await fetch(
      "https://apis.kahoot.it/media-api/youtube/key",
      { timeout: 10000 }
    );
    const data = await response.json();

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET");
    res.setHeader("Content-Type", "application/json");

    res.status(200).json(data);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

// サーバー起動
app.listen(PORT, () => {
  console.log(`\n✨=========================================✨`);
  console.log(` 🚀 サーバーがポート ${PORT} で完全に起動しました！`);
  console.log(` 📦 アカウント、データ同期、壁紙機能すべて稼働中。`);
  console.log(`✨=========================================✨\n`);
});
