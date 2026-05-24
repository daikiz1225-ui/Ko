/* kanrenn.js - Vercel Edge Runtime & CodeSandbox CommonJS 両対応版 */

// 1. Vercel用のランタイム設定（この記述のままで両方の環境でエラーになりません）
const config = { runtime: "edge" };

function isJapanese(text) {
  return /[\u3040-\u309F\u30A0-\u30FF]/.test(text);
}

// streaming.js と同じインスタンス群
const APIS = [
  "https://inv.nadeko.net/",
  "https://invidious.f5.si/",
  "https://invidious.lunivers.trade/",
  "https://invidious.ducks.party/",
  "https://iv.melmac.space/",
  "https://invidious.nerdvpn.de/",
  "https://invidious.privacyredirect.com",
  "https://invidious.technicalvoid.dev",
  "https://invidious.darkness.services",
  "https://invidious.nikkosphere.com",
  "https://invidious.schenkel.eti.br",
  "https://invidious.tiekoetter.com",
  "https://invidious.perennialte.ch",
  "https://invidious.reallyaweso.me",
  "https://invidious.private.coffee",
  "https://invidious.privacydev.net",
  "https://yewtu.be",
  "https://iv.nboeck.de",
  "https://inv.tux.pizza",
  "https://iv.ggtyler.dev",
  "https://yt.omada.cafe",
  "https://super8.absturztau.be",
  "https://invidious.adminforge.de",
  "https://youtube.alt.tyil.nl",
  "https://rust.oskamp.nl",
  "https://invidious.nietzospannend.nl",
  "https://youtube.mosesmang.com",
];

async function fetchRelatedWithFallback(vId) {
  for (const base of APIS) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      const res = await fetch(`${base}/api/v1/videos/${vId}?region=JP`, {
        signal: controller.signal,
      });
      if (!res.ok) continue;

      const data = await res.json();
      clearTimeout(timeoutId);

      const related = data.relatedVideos || data.recommendedVideos || [];
      const filtered = related.filter((v) => isJapanese(v.title));

      if (filtered.length > 0) return filtered;
    } catch (e) {
      continue;
    }
  }
  return [];
}

// 🌟 メインの処理ロジック（VercelとExpressの差異を吸収できるように共通関数化）
async function processRecommendation(vId) {
  if (!vId) return { status: 400, body: ["No ID"] };
  try {
    let finalJapaneseVideos = await fetchRelatedWithFallback(vId);
    const resultIds = finalJapaneseVideos.map((v) => v.videoId);

    if (resultIds.length === 0) {
      return { status: 200, body: ["DEBUG_EMPTY_DATA"] };
    }
    return { status: 200, body: resultIds };
  } catch (e) {
    return { status: 500, body: ["ERROR"] };
  }
}

// 🌟 Vercel (Edge Runtime) 用のエントリーポイント
async function handler(req) {
  const { searchParams } = new URL(req.url);
  const vId = searchParams.get("vId");
  const result = await processRecommendation(vId);

  // Vercel専用のResponseオブジェクトを返す
  return new Response(JSON.stringify(result.body), {
    status: result.status,
    headers: { "Content-Type": "application/json" },
  });
}

// 🌟 CodeSandbox (Express / Node.js) 用のエントリーポイント
function expressHandler(req, res) {
  const vId = req.query.vId;
  processRecommendation(vId)
    .then((result) => {
      res.status(result.status).json(result.body);
    })
    .catch((err) => {
      res.status(500).json(["ERROR"]);
    });
}

// 🌟 環境を自動判定してエクスポートを切り替える魔改造システム
if (typeof module !== "undefined" && module.exports) {
  // CodeSandbox (Node.js環境) の場合
  module.exports = { config, handler: expressHandler, isExpress: true };
} else {
  // Vercel環境の場合 (グローバル展開してVercelのビルダーに認識させる)
  self.config = config;
  self.default = handler;
}
