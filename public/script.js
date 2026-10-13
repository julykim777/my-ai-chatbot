const chatBox = document.getElementById("chat-box");
const chatForm = document.getElementById("chat-form");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");
const resetBtn = document.getElementById("reset-btn");
const themeBtn = document.getElementById("theme-btn");
const welcome = document.getElementById("welcome");
const msgCount = document.getElementById("msg-count");
const clock = document.getElementById("clock");

const BOT_AVATAR = "🤖";
const USER_AVATAR = "😎";
const TYPING_SPEED = 18; // 글자당 ms

// 대화 기록 (DB 대신 브라우저 메모리에 보관하고 매 요청마다 서버로 전송)
let messages = [];

function timeNow() {
  return new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
}

function scrollToBottom() {
  chatBox.scrollTop = chatBox.scrollHeight;
}

function updateCount() {
  msgCount.textContent = `메시지 ${messages.length}개`;
}

// 아바타 + 말풍선 + 시간(+ 복사 버튼) 한 줄 만들기
function addMessage(text, role) {
  welcome.hidden = true;

  const row = document.createElement("div");
  row.className = `msg-row ${role}`;

  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = role === "user" ? USER_AVATAR : role === "error" ? "⚠️" : BOT_AVATAR;

  const body = document.createElement("div");
  body.className = "msg-body";

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = text;

  const meta = document.createElement("div");
  meta.className = "meta";
  meta.textContent = timeNow();

  body.append(bubble, meta);
  row.append(avatar, body);
  chatBox.appendChild(row);
  scrollToBottom();

  return { row, bubble, meta };
}

function addCopyButton(meta, text) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "copy-btn";
  btn.textContent = "📋 복사";
  btn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(text);
      btn.textContent = "✔ 복사됨";
    } catch {
      btn.textContent = "✖ 실패";
    }
    setTimeout(() => (btn.textContent = "📋 복사"), 1500);
  });
  meta.appendChild(btn);
}

// 점 세 개 로딩 표시
function showTyping() {
  const { row, bubble } = addMessage("", "assistant");
  bubble.innerHTML = '<span class="dots"><span></span><span></span><span></span></span>';
  return row;
}

// 답변을 한 글자씩 출력
function typeWriter(bubble, text) {
  return new Promise((resolve) => {
    const chars = Array.from(text);
    let i = 0;
    bubble.textContent = "";
    bubble.classList.add("typing");

    const timer = setInterval(() => {
      bubble.textContent += chars.slice(i, i + 2).join("");
      i += 2;
      scrollToBottom();
      if (i >= chars.length) {
        clearInterval(timer);
        bubble.classList.remove("typing");
        resolve();
      }
    }, TYPING_SPEED);
  });
}

async function sendMessage(text) {
  messages.push({ role: "user", content: text });
  addMessage(text, "user");
  updateCount();

  sendBtn.disabled = true;
  const typingRow = showTyping();

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
    });
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || "요청에 실패했습니다.");

    typingRow.remove();
    messages.push({ role: "assistant", content: data.reply });
    updateCount();

    const { bubble, meta } = addMessage("", "assistant");
    await typeWriter(bubble, data.reply);
    addCopyButton(meta, data.reply);
  } catch (err) {
    typingRow.remove();
    messages.pop(); // 실패한 질문은 기록에서 제거
    updateCount();
    addMessage(err.message, "error");
  } finally {
    sendBtn.disabled = false;
    userInput.focus();
  }
}

chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = userInput.value.trim();
  if (!text || sendBtn.disabled) return;
  userInput.value = "";
  userInput.style.height = "auto";
  sendMessage(text);
});

// Enter로 전송, Shift+Enter로 줄바꿈
userInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
    e.preventDefault();
    chatForm.requestSubmit();
  }
});

// 입력창 높이 자동 조절
userInput.addEventListener("input", () => {
  userInput.style.height = "auto";
  userInput.style.height = `${userInput.scrollHeight}px`;
});

// 추천 질문 버튼
document.querySelectorAll(".chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    if (sendBtn.disabled) return;
    sendMessage(chip.textContent.replace(/^\S+\s/, "")); // 앞의 이모지 제거
  });
});

// 새 대화
resetBtn.addEventListener("click", () => {
  if (sendBtn.disabled) return;
  messages = [];
  chatBox.querySelectorAll(".msg-row").forEach((row) => row.remove());
  welcome.hidden = false;
  updateCount();
  userInput.focus();
});

// 낮/밤 테마 전환 (선택한 테마는 브라우저에 기억)
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  themeBtn.textContent = theme === "dark" ? "☀️ 낮 모드" : "🌙 밤 모드";
}

themeBtn.addEventListener("click", () => {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  applyTheme(next);
  try {
    localStorage.setItem("theme", next);
  } catch {}
});

try {
  applyTheme(localStorage.getItem("theme") || "light");
} catch {
  applyTheme("light");
}

// 상태 바 시계
function tick() {
  clock.textContent = `🕒 ${timeNow()}`;
}
tick();
setInterval(tick, 10000);
