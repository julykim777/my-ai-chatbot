// Express 앱 (Vercel 서버리스 함수로 배포됨)
require("dotenv").config();
const express = require("express");
const OpenAI = require("openai");

const app = express();
app.use(express.json({ limit: "1mb" }));

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const MODEL = "gpt-4o-mini";
const MAX_HISTORY = 20; // 최근 대화 몇 개까지 모델에 보낼지
const SYSTEM_PROMPT =
  "You are a friendly and helpful AI assistant. Answer in the same language the user uses.";

// 데이터베이스 없이 클라이언트가 보내준 대화 기록으로 맥락을 유지한다.
app.post("/api/chat", async (req, res) => {
  const { messages } = req.body || {};

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "messages 배열이 필요합니다." });
  }

  // user / assistant 메시지만 허용하고 최근 대화만 사용
  const history = messages
    .filter(
      (m) =>
        m &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.trim() !== ""
    )
    .slice(-MAX_HISTORY)
    .map((m) => ({ role: m.role, content: m.content }));

  if (history.length === 0) {
    return res.status(400).json({ error: "유효한 메시지가 없습니다." });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...history],
    });

    res.json({ reply: completion.choices[0].message.content });
  } catch (err) {
    console.error("OpenAI API error:", err);
    res.status(500).json({ error: "AI 응답을 가져오는 중 오류가 발생했습니다." });
  }
});

module.exports = app;
