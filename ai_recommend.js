/* ai_recommend.js - Vercel Edge Runtime & CodeSandbox CommonJS 両対応版 */

const config = { runtime: "edge" };

const JP_REGEX = /[\u3040-\u309F\u30A0-\u30FF]/;

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

// 🌟 メインの共通処理ロジック（VercelとExpressの両方から使い回せるように分離）
async function getRecommendations(vId) {
  if (!vId) return { status: 400, body: ["No ID"] };

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

      const baseCategoryId = data.categoryId;
      const related = data.relatedVideos || data.recommendedVideos || [];

      // フィルタリング：日本語、かつショート動画（60秒以下）を除外
      let filtered = related.filter((v) => {
        const isJp = v.title && JP_REGEX.test(v.title);
        const isNotShort = v.lengthSeconds > 60;
        return isJp && isNotShort;
      });

      if (filtered.length === 0) continue;

      // カテゴリ一致を優先
      if (baseCategoryId) {
        filtered.sort((a, b) => {
          const aMatch = a.categoryId === baseCategoryId ? 1 : 0;
          const bMatch = b.categoryId === baseCategoryId ? 1 : 0;
          return bMatch - aMatch;
        });
      }

      const resultIds = [...new Set(filtered.map((v) => v.videoId))].slice(
        0,
        40
      );
      return { status: 200, body: resultIds };
    } catch (e) {
      continue;
    }
  }
  return { status: 500, body: { error: "ALL_APIS_DOWN" } };
}

// 🌟 Vercel (Edge Runtime) 用のエントリーポイント
async function handler(req) {
  const { searchParams } = new URL(req.url);
  const vId = searchParams.get("vId");
  const result = await getRecommendations(vId);

  return new Response(JSON.stringify(result.body), {
    status: result.status,
    headers: { "Content-Type": "application/json" },
  });
}

// 🌟 CodeSandbox (Express / Node.js) 用のエントリーポイント
function expressHandler(req, res) {
  const vId = req.query.vId;
  getRecommendations(vId)
    .then((result) => {
      res.status(result.status).json(result.body);
    })
    .catch((err) => {
      res.status(500).json({ error: "SERVER_ERROR" });
    });
}

// 🌟 環境自動判定エクスポート
if (typeof module !== "undefined" && module.exports) {
  // CodeSandbox環境用
  module.exports = { config, handler: expressHandler, isExpress: true };
} else {
  // Vercel環境用
  self.config = config;
  self.default = handler;
}
