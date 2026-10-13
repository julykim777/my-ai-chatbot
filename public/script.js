const chatBox = document.getElementById("chat-box");
const chatForm = document.getElementById("chat-form");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");
const resetBtn = document.getElementById("reset-btn");

// 대화 기록 (DB 대신 브라우저 메모리에 보관하고 매 요청마다 서버로 전송)
let messages = [];

function addMessage(text, className) {
  const div = document.createElement("div");
  div.className = `message ${className}`;
  div.textContent = text;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
  return div;
}

async function sendMessage(text) {
  messages.push({ role: "user", content: text });
  addMessage(text, "user");

  sendBtn.disabled = true;
  const loading = addMessage("답변을 작성하는 중...", "assistant loading");

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
    });
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || "요청에 실패했습니다.");

    loading.remove();
    messages.push({ role: "assistant", content: data.reply });
    addMessage(data.reply, "assistant");
  } catch (err) {
    loading.remove();
    messages.pop(); // 실패한 질문은 기록에서 제거
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

resetBtn.addEventListener("click", () => {
  messages = [];
  chatBox.innerHTML = "";
  addMessage("안녕하세요! 무엇을 도와드릴까요?", "assistant");
  userInput.focus();
});
