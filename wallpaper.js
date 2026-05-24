/* wallpaper.js - Upstash Redis & CodeSandbox JSON-DB 両対応版 */
const fs = require("fs");
const path = require("path");

// 🌟 Vercel環境用のボディサイズ制限設定
const config = {
  api: {
    bodyParser: {
      sizeLimit: "4mb",
    },
  },
};

// 📂 CodeSandbox / ローカル用の簡易JSONデータベース設定
const DB_FILE = path.join(__dirname, "db.json");

// 🌟 Upstash Redis / ローカルファイルDB のハイブリッド接続設定
let kv;
if (typeof module !== "undefined" && module.exports && !process.env.VERCEL) {
  // 📦 CodeSandbox / ローカル環境用の疑似Redisシステム
  kv = {
    async get(key) {
      if (!fs.existsSync(DB_FILE)) return null;
      const data = JSON.parse(fs.readFileSync(DB_FILE, "utf8") || "{}");
      return data[key] || null;
    },
    async set(key, value) {
      let data = {};
      if (fs.existsSync(DB_FILE)) {
        data = JSON.parse(fs.readFileSync(DB_FILE, "utf8") || "{}");
      }
      data[key] = value;
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf8");
      return "OK";
    },
  };
  console.log("📦 wallpaper: CodeSandbox環境用のファイルDBを割り当てました。");
} else {
  // 🚀 Vercel環境用の本物の Upstash Redis
  const { Redis } = require("@upstash/redis");
  kv = new Redis({
    url: "https://big-monkfish-128403.upstash.io",
    token: "gQAAAAAAAfWTAAIgcDFiMmMyYjE5ZTA5ODc0Y2ZiYTM2NGFiYTU4MWVlMGViYQ",
  });
}

// 🌟 メインの壁紙処理ロジック（Vercel/Express両方に対応）
async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });
  const { username, action, wallpaperData } = req.body;

  if (!username) return res.status(400).json({ error: "ログインが必要です" });

  // 🎨 壁紙の保存
  if (action === "save") {
    try {
      await kv.set(`user:${username}:wallpaper`, wallpaperData);
      return res
        .status(200)
        .json({ success: true, message: "🎨 壁紙をサーバーに保存しました！" });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "壁紙の保存に失敗しました" });
    }
  }

  // 🔄 壁紙の読み込み
  if (action === "load") {
    try {
      const data = await kv.get(`user:${username}:wallpaper`);
      if (!data)
        return res.status(404).json({ error: "壁紙が設定されていません" });
      return res.status(200).json({ success: true, wallpaper: data });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "壁紙の読み込みに失敗しました" });
    }
  }
}

// 🌟 環境自動判定エクスポートシステム
if (typeof module !== "undefined" && module.exports) {
  module.exports = handler;
  module.exports.config = config;
  module.exports.default = handler;
} else {
  self.config = config;
  self.default = handler;
}
