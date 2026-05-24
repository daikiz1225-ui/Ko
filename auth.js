/* auth.js - Upstash Redis クラウド直結・CodeSandbox対応版 */
const crypto = require('crypto');

// 🚀 指定された Upstash Redis クラウドサーバーへ直接接続
const { Redis } = require('@upstash/redis');
const kv = new Redis({
  url: "https://big-monkfish-128403.upstash.io",
  token: "gQAAAAAAAfWTAAIgcDFiMmMyYjE5ZTA5ODc0Y2ZiYTM2NGFiYTU4MWVlMGViYQ",
});

// メインハンドラー
async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: "Method not allowed" });
  
  // フロントエンドからのリクエストボディを取得
  const { action, username, password } = req.body;

  if (!username || !password) return res.status(400).json({ error: "ユーザー名とパスワードを入力してください" });

  // パスワードのハッシュ化（sha256 + 指定キー）
  const hashPassword = (pwd) => {
      return crypto.createHmac('sha256', 'super-secret-key').update(pwd).digest('hex');
  };

  // 📝 【アカウント新規作成】
  if (action === 'signup') {
      try {
          const exists = await kv.exists(`user:${username}`);
          if (exists) return res.status(400).json({ error: "このユーザー名は既に使われています" });

          const hashedPassword = hashPassword(password);
          // 文字列化したJSONオブジェクトとしてUpstashクラウドへ保存
          await kv.set(`user:${username}`, JSON.stringify({ password: hashedPassword }));
          return res.status(200).json({ success: true, message: "アカウントを作成しました！" });
      } catch (error) {
          console.error("Signup Error:", error);
          return res.status(500).json({ error: "サーバーエラー" });
      }
  }

  // 🔑 【ログイン処理】
  if (action === 'login') {
      try {
          // Upstashクラウドから直接データを取り出す
          let userData = await kv.get(`user:${username}`);
          if (!userData) return res.status(400).json({ error: "ユーザー名またはパスワードが違います" });

          // 🌟 クラウドからの「データの取りに行き方」を厳密に準拠
          // 返ってきた値が文字列のままだった場合、オブジェクトにパース（復元）する
          if (typeof userData === 'string') {
              try {
                  userData = JSON.parse(userData);
              } catch (e) {
                  // 万が一、昔のデータが生の文字列で入っていた場合の救済策
                  userData = { password: userData };
              }
          }

          const hashedPassword = hashPassword(password);
          
          // ハッシュ化されたパスワード同士を厳密に比較
          if (!userData || userData.password !== hashedPassword) {
              return res.status(400).json({ error: "ユーザー名またはパスワードが違います" });
          }

          return res.status(200).json({ success: true, username: username });
      } catch (error) {
          console.error("Login Error:", error);
          return res.status(500).json({ error: "サーバーエラー" });
      }
  }
}

// Node.js (Express / CodeSandbox) 環境向けのエクスポート
if (typeof module !== 'undefined' && module.exports) {
    module.exports = handler;
    module.exports.default = handler;
} else {
    self.default = handler;
}