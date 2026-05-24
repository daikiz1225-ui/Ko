/* sync.js - Upstash Redis クラウド直結・CodeSandbox対応版 */

// 🚀 指定された Upstash Redis クラウドサーバーへ直接接続
const { Redis } = require("@upstash/redis");
const kv = new Redis({
  url: "https://big-monkfish-128403.upstash.io",
  token: "gQAAAAAAAfWTAAIgcDFiMmMyYjE5ZTA5ODc0Y2ZiYTM2NGFiYTU4MWVlMGViYQ",
});

// メインハンドラー
async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  // フロントエンドからのリクエストボディを取得
  const { username, action, backupData } = req.body;

  if (!username) return res.status(400).json({ error: "ログインが必要です" });

  // ☁️ 【オンライン保存（セーブ）】
  if (action === "save") {
    try {
      // 文字列化したJSONオブジェクトとしてUpstashクラウドへ保存
      await kv.set(`user:${username}:data`, JSON.stringify(backupData));
      return res
        .status(200)
        .json({ success: true, message: "☁️ オンライン保存が完了しました！" });
    } catch (error) {
      console.error("Save Error:", error);
      return res.status(500).json({ error: "保存失敗" });
    }
  }

  // 🔄 【オンライン読み込み（ロード）】
  if (action === "load") {
    try {
      // Upstashクラウドから直接データを取り出す
      let data = await kv.get(`user:${username}:data`);
      if (!data)
        return res.status(404).json({ error: "保存データがありません" });

      // 🌟 クラウドからの「データの取りに行き方」を厳密に準拠
      // 返ってきた値が文字列のままだった場合、オブジェクトに復元（パース）してフロントに返す
      if (typeof data === "string") {
        try {
          data = JSON.parse(data);
        } catch (e) {
          // パースに失敗した場合はそのまま通す
        }
      }

      return res.status(200).json({ success: true, data: data });
    } catch (error) {
      console.error("Load Error:", error);
      return res.status(500).json({ error: "読み込み失敗" });
    }
  }
}

// Node.js (Express / CodeSandbox) 環境向けのエクスポート
if (typeof module !== "undefined" && module.exports) {
  module.exports = handler;
  module.exports.default = handler;
} else {
  self.default = handler;
}
