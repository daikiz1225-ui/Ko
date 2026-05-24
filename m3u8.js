/**
 * api/m3u8.js
 * フロントをいじらずに、画面にエラー内容を無理やり出すバージョン (Vercel & CodeSandbox 両対応版)
 */

async function handler(req, res) {
  // Vercel と Express のクエリ取得の差異をカバー (念のためのケア)
  const id = (req.query && req.query.id) || (req.query ? req.query.id : null);

  if (!id) {
    return res
      .status(200)
      .json({ url: "", success: false, error: "IDがありません" });
  }

  const PIPED_SERVERS = [
    "https://pipedapi.kavin.rocks",
    "https://api-piped.mha.fi",
    "https://pipedapi.adminforge.de",
    "https://pipedapi.pfcd.me",
    "https://api.piped.projectsegfau.lt",
    "https://pipedapi.in.projectsegfau.lt",
    "https://pipedapi.us.projectsegfau.lt",
    "https://watchapi.whatever.social",
    "https://api.piped.privacydev.net",
    "https://pipedapi.aeong.one",
    "https://pipedapi.leptons.xyz",
    "https://piped-api.garudalinux.org",
    "https://pipedapi.rivo.lol",
    "https://pipedapi.colinslegacy.com",
    "https://api.piped.yt",
    "https://pipedapi.palveluntarjoaja.eu",
    "https://pipedapi.smnz.de",
    "https://pa.mint.lgbt",
    "https://pa.il.ax",
    "https://piped-api.privacy.com.de",
    "https://api.piped.link",
    "https://api.piped.lunar.icu",
    "https://pipedapi.osphost.fi",
    "https://pipedapi.darkness.services",
    "https://pipedapi.ggtyler.dev",
    "https://pipedapi.qdi.fi",
    "https://api.piped.rocks",
    "https://pipedapi.astreon.xyz",
  ];

  const shuffledServers = PIPED_SERVERS.sort(() => Math.random() - 0.5);
  let errorSummary = [];

  for (const server of shuffledServers) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(`${server}/streams/${id}`, {
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        errorSummary.push(`${new URL(server).hostname}(${response.status})`);
        continue;
      }

      const data = await response.json();
      if (data && data.hls) {
        // 成功時は普通に返す
        return res.status(200).json({
          url: data.hls,
          server: server,
          success: true,
        });
      }
    } catch (e) {
      errorSummary.push(`${new URL(server).hostname}(Timeout)`);
      continue;
    }
  }

  // --- ここがミソ ---
  // すべて失敗した場合、本来「url」が入る場所に、エラーの履歴を詰め込んで「200 OK」で返します。
  const finalErrorMessage = `全滅:${errorSummary.slice(-3).join(", ")}`;

  return res.status(200).json({
    success: false,
    url: finalErrorMessage, // URLフィールドにエラーを偽装して入れる
    error: finalErrorMessage,
  });
}

// 🌟 環境自動判定エクスポートシステム
if (typeof module !== "undefined" && module.exports) {
  // CodeSandbox (Express) 用の共通エクスポート形式
  module.exports = handler;
  // メインの handler としても直接叩けるようにドッキング
  module.exports.default = handler;
} else {
  // Vercel (Serverless / Edge) 環境用のデフォルトエクスポート
  self.default = handler;
}
