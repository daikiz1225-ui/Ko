/* streaming.js - Vercel Edge Runtime & CodeSandbox CommonJS 両対応版 */

const config = { runtime: "edge" };

// 🌟 メインの共通処理ロジック（VercelとExpressの両方から使い回せるように分離）
async function getStreamUrl(id) {
  if (!id) return { status: 400, type: "error", body: "Video ID is required" };

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

  const TARGET_QUALITIES = ["1080p", "720p", "480p", "360p"];

  for (const base of APIS) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      const res = await fetch(`${base}/api/v1/videos/${id}`, {
        signal: controller.signal,
      });
      const data = await res.json();
      clearTimeout(timeoutId);

      let streamUrl = null;

      // 1. まずは 1080p や 720p の「映像＋音声」セットを探す
      for (const q of TARGET_QUALITIES) {
        const found = data.formatStreams?.find(
          (s) => s.qualityLabel === q || s.quality === q
        );
        if (found && found.url) {
          streamUrl = found.url;
          break;
        }
      }

      // 2. もしセット品に見つからなければ、adaptiveFormats(映像のみ)から高画質を探す
      if (!streamUrl) {
        for (const q of ["1080p", "720p"]) {
          const found = data.adaptiveFormats?.find(
            (s) =>
              (s.qualityLabel === q || s.quality === q) &&
              s.type.includes("video/mp4")
          );
          if (found && found.url) {
            streamUrl = found.url;
            break;
          }
        }
      }

      // 3. 最終手段：なんでもいいから一番上のやつ
      if (!streamUrl && data.formatStreams?.length > 0) {
        streamUrl = data.formatStreams[0].url;
      }

      if (streamUrl) {
        return { status: 302, type: "redirect", url: streamUrl };
      }
    } catch (e) {
      continue;
    }
  }

  return {
    status: 500,
    type: "error",
    body: "全てのサーバーで高画質ソースが見つかりませんでした。",
  };
}

// 🌟 Vercel (Edge Runtime) 用のエントリーポイント
async function handler(req) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const result = await getStreamUrl(id);

  if (result.type === "redirect") {
    return Response.redirect(result.url, 302);
  } else {
    return new Response(result.body, { status: result.status });
  }
}

// 🌟 CodeSandbox (Express / Node.js) 用のエントリーポイント
function expressHandler(req, res) {
  const id = req.query.id;
  getStreamUrl(id)
    .then((result) => {
      if (result.type === "redirect") {
        res.redirect(302, result.url);
      } else {
        res.status(result.status).send(result.body);
      }
    })
    .catch((err) => {
      res.status(500).send("SERVER_ERROR");
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
