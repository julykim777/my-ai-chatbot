const chatBox = document.getElementById("chat-box");
const chatForm = document.getElementById("chat-form");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");
const resetBtn = document.getElementById("reset-btn");
const themeBtn = document.getElementById("theme-btn");
const welcome = document.getElementById("welcome");
const msgCount = document.getElementById("msg-count");
const clock = document.getElementById("clock");
const transferBtn = document.getElementById("transfer-btn");
const transferModal = document.getElementById("transfer-modal");
const modalClose = document.getElementById("modal-close");
const qrBox = document.getElementById("qr");
const transferNote = document.getElementById("transfer-note");
const copyLinkBtn = document.getElementById("copy-link-btn");
const shareBtn = document.getElementById("share-btn");

const BOT_AVATAR = "🤖";
const USER_AVATAR = "😎";
const TYPING_SPEED = 18; // 글자당 ms

const STORAGE_KEY = "chat-history";

// 대화 기록 (DB 대신 브라우저 localStorage에 저장하고 매 요청마다 서버로 전송)
let messages = [];

function saveHistory() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  } catch {}
}

function loadHistory() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

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
function addMessage(text, role, time = timeNow()) {
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
  meta.textContent = time;

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
  const time = timeNow();
  messages.push({ role: "user", content: text, time });
  addMessage(text, "user", time);
  updateCount();
  saveHistory();

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
    const replyTime = timeNow();
    messages.push({ role: "assistant", content: data.reply, time: replyTime });
    updateCount();
    saveHistory();

    const { bubble, meta } = addMessage("", "assistant", replyTime);
    await typeWriter(bubble, data.reply);
    addCopyButton(meta, data.reply);
  } catch (err) {
    typingRow.remove();
    messages.pop(); // 실패한 질문은 기록에서 제거
    updateCount();
    saveHistory();
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
  saveHistory();
  userInput.focus();
});

// 가운데 정렬 안내 메시지 (대화 기록에는 포함되지 않음)
function addNotice(text) {
  welcome.hidden = true;
  const row = document.createElement("div");
  row.className = "msg-row notice";
  const span = document.createElement("span");
  span.textContent = text;
  row.appendChild(span);
  chatBox.appendChild(row);
  scrollToBottom();
}

function renderHistory() {
  chatBox.querySelectorAll(".msg-row").forEach((row) => row.remove());
  welcome.hidden = messages.length > 0;
  messages.forEach((m) => {
    const { meta } = addMessage(m.content, m.role, m.time || "");
    if (m.role === "assistant") addCopyButton(meta, m.content);
  });
  updateCount();
}

// ===== 다른 기기로 옮기기 (DB 없이 링크 #뒤에 대화를 압축해서 담음) =====
const TRANSFER_PREFIX = "#import=";
const MAX_TRANSFER = 20;

async function encodeHistory(list) {
  const compact = list.map((m) => ({ r: m.role === "user" ? "u" : "a", c: m.content, t: m.time || "" }));
  const stream = new Blob([JSON.stringify(compact)])
    .stream()
    .pipeThrough(new CompressionStream("deflate-raw"));
  const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function decodeHistory(code) {
  const binary = atob(code.replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  const compact = JSON.parse(await new Response(stream).text());
  return compact.map((m) => ({
    role: m.r === "u" ? "user" : "assistant",
    content: String(m.c),
    time: m.t || "",
  }));
}

// QR에 다 안 들어가면 오래된 메시지부터 빼면서 맞춤
async function buildTransferLink() {
  const base = location.origin + location.pathname;
  for (let n = Math.min(messages.length, MAX_TRANSFER); n >= 1; n--) {
    const url = base + TRANSFER_PREFIX + (await encodeHistory(messages.slice(-n)));
    try {
      const qr = qrcode(0, "L");
      qr.addData(url);
      qr.make();
      return { url, qr, count: n };
    } catch {
      // 너무 길면 메시지 수를 줄여서 다시 시도
    }
  }
  return { url: base + TRANSFER_PREFIX + (await encodeHistory(messages.slice(-1))), qr: null, count: 1 };
}

let transferUrl = "";

transferBtn.addEventListener("click", async () => {
  qrBox.innerHTML = "";
  transferModal.hidden = false;

  if (messages.length === 0) {
    transferNote.textContent = "아직 옮길 대화가 없어요. 먼저 대화를 시작해 봐!";
    copyLinkBtn.hidden = shareBtn.hidden = true;
    return;
  }

  const { url, qr, count } = await buildTransferLink();
  transferUrl = url;
  if (qr) qrBox.innerHTML = qr.createImgTag(4, 0);
  transferNote.textContent =
    count < messages.length ? `최근 메시지 ${count}개를 옮겨요` : `메시지 ${count}개를 옮겨요`;
  copyLinkBtn.hidden = false;
  shareBtn.hidden = !navigator.share;
});

copyLinkBtn.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(transferUrl);
    copyLinkBtn.textContent = "✔ 복사됨";
  } catch {
    copyLinkBtn.textContent = "✖ 실패";
  }
  setTimeout(() => (copyLinkBtn.textContent = "🔗 링크 복사"), 1500);
});

shareBtn.addEventListener("click", () => {
  navigator.share({ title: "AI 챗봇 대화 이어하기", url: transferUrl }).catch(() => {});
});

function closeModal() {
  transferModal.hidden = true;
}
modalClose.addEventListener("click", closeModal);
transferModal.addEventListener("click", (e) => {
  if (e.target === transferModal) closeModal();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
});

// 링크로 들어왔으면 대화 가져오기
async function importFromLink() {
  if (!location.hash.startsWith(TRANSFER_PREFIX)) return;
  const code = location.hash.slice(TRANSFER_PREFIX.length);
  history.replaceState(null, "", location.pathname + location.search);

  try {
    const imported = await decodeHistory(code);
    if (
      messages.length > 0 &&
      !confirm("다른 기기에서 가져온 대화로 바꿀까요?\n(이 기기의 지금 대화는 사라져요)")
    ) {
      return;
    }
    messages = imported;
    saveHistory();
    renderHistory();
    addNotice("📱 다른 기기의 대화를 불러왔어요! 이어서 이야기해요");
  } catch {
    addNotice("⚠️ 대화를 불러오지 못했어요. 링크가 잘렸을 수 있어요");
  }
}

// 저장된 대화 복원 (새로고침해도 이전 대화 유지)
messages = loadHistory();
renderHistory();
importFromLink();

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
