// 로컬 개발용 서버 (Vercel에서는 사용되지 않음)
const path = require("path");
const express = require("express");
const app = require("./api/index");

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "public")));

app.listen(PORT, () => {
  console.log(`Chatbot running at http://localhost:${PORT}`);
});
