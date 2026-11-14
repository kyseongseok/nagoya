// Vercel 서버리스 함수: 구글 번역 키를 브라우저에 노출하지 않고 대신 호출해준다.
// 필요한 환경 변수: GOOGLE_TRANSLATE_KEY (Vercel → Settings → Environment Variables)

const ALLOWED = new Set(["ko", "ja"]);
const MAX_CHARS = 300; // 한 번에 번역할 최대 글자 수 (요금 폭주 방지)

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "POST만 지원해요" });
    return;
  }

  const key = process.env.GOOGLE_TRANSLATE_KEY;
  if (!key) {
    res.status(503).json({ error: "GOOGLE_TRANSLATE_KEY가 설정되지 않았어요" });
    return;
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  const q = String((body && body.q) || "").trim();
  const source = String((body && body.source) || "");
  const target = String((body && body.target) || "");

  if (!q) { res.status(400).json({ error: "번역할 문장이 없어요" }); return; }
  if (q.length > MAX_CHARS) { res.status(400).json({ error: MAX_CHARS + "자 이하로 입력하세요" }); return; }
  if (!ALLOWED.has(source) || !ALLOWED.has(target) || source === target) {
    res.status(400).json({ error: "한국어↔일본어만 지원해요" });
    return;
  }

  try {
    const r = await fetch(
      "https://translation.googleapis.com/language/translate/v2?key=" + encodeURIComponent(key),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q, source, target, format: "text" }),
      }
    );
    const j = await r.json();
    if (!r.ok) {
      res.status(502).json({ error: (j && j.error && j.error.message) || "구글 번역 오류" });
      return;
    }
    const text = j && j.data && j.data.translations && j.data.translations[0] && j.data.translations[0].translatedText;
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({ text: text || "" });
  } catch (e) {
    res.status(502).json({ error: "구글 번역에 연결하지 못했어요" });
  }
};
