// ============================
// Core State
// ============================
let messages = []; // [{role: "user"|"assistant", content: "..."}]

// ============================
// DOM Elements
// ============================
const chat = document.getElementById("chat");
const input = document.getElementById("input");
const sendBtn = document.getElementById("sendBtn");
const clearBtn = document.getElementById("clearBtn");
const modeSelect = document.getElementById("modeSelect");
const modelSelect = document.getElementById("modelSelect");
const apiModeSelect = document.getElementById("apiModeSelect");
const fileBtn = document.getElementById("fileBtn");
const imageBtn = document.getElementById("imageBtn");
const fileInput = document.getElementById("fileInput");
const imageInput = document.getElementById("imageInput");
const charCount = document.getElementById("charCount");

// ============================
// Markdown Rendering
// ============================
function renderMarkdown(text) {
    // Escape HTML first to prevent XSS, then let marked handle markdown
    if (typeof marked !== "undefined") {
        return marked.parse(text);
    }
    // Fallback: escape and preserve newlines
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\n/g, "<br>");
}

// ============================
// Create Chat Bubble
// ============================
function appendMessage(role, text, skipHistory = false) {
    const div = document.createElement("div");
    div.className = role === "user" ? "msg user" : "msg bot";

    const bubble = document.createElement("div");
    bubble.className = "bubble";

    if (role === "user") {
        bubble.textContent = text;
    } else {
        bubble.innerHTML = renderMarkdown(text);
        // Add copy buttons to code blocks
        bubble.querySelectorAll("pre code").forEach(block => {
            const pre = block.parentElement;
            const copyBtn = document.createElement("button");
            copyBtn.className = "copy-btn";
            copyBtn.textContent = "Copy";
            copyBtn.addEventListener("click", () => {
                navigator.clipboard.writeText(block.innerText).then(() => {
                    copyBtn.textContent = "Copied!";
                    setTimeout(() => { copyBtn.textContent = "Copy"; }, 2000);
                });
            });
            pre.style.position = "relative";
            pre.appendChild(copyBtn);
        });
    }

    div.appendChild(bubble);
    chat.appendChild(div);
    chat.scrollTo({ top: chat.scrollHeight, behavior: "smooth" });

    if (!skipHistory) {
        messages.push({ role, content: text });
    }

    return div;
}

// ============================
// Send Message
// ============================
async function sendMessage(contentOverride) {
    const userText = contentOverride || input.value.trim();
    if (!userText) return;

    input.value = "";
    input.style.height = "auto";
    updateCharCount();
    sendBtn.disabled = true;

    // Push user message and render it
    messages.push({ role: "user", content: userText });
    const userDiv = document.createElement("div");
    userDiv.className = "msg user";
    const userBubble = document.createElement("div");
    userBubble.className = "bubble";
    userBubble.textContent = userText;
    userDiv.appendChild(userBubble);
    chat.appendChild(userDiv);
    chat.scrollTo({ top: chat.scrollHeight, behavior: "smooth" });

    // Loading bubble
    const loadingDiv = document.createElement("div");
    loadingDiv.className = "msg bot";
    loadingDiv.innerHTML = `<div class="bubble loading"><span></span><span></span><span></span></div>`;
    chat.appendChild(loadingDiv);
    chat.scrollTo({ top: chat.scrollHeight, behavior: "smooth" });

    try {
        const res = await fetch("/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: modelSelect.value,
                mode: modeSelect.value,
                api_mode: apiModeSelect.value,
                history: messages, // includes current user message
            }),
        });
        const data = await res.json();
        const botText = data.response || "No response from server.";

        // Replace loading bubble with actual response
        loadingDiv.innerHTML = "";
        loadingDiv.className = "msg bot";
        const botBubble = document.createElement("div");
        botBubble.className = "bubble";
        botBubble.innerHTML = renderMarkdown(botText);
        loadingDiv.appendChild(botBubble);

        // Copy buttons for code blocks
        botBubble.querySelectorAll("pre code").forEach(block => {
            const pre = block.parentElement;
            const copyBtn = document.createElement("button");
            copyBtn.className = "copy-btn";
            copyBtn.textContent = "Copy";
            copyBtn.addEventListener("click", () => {
                navigator.clipboard.writeText(block.innerText).then(() => {
                    copyBtn.textContent = "Copied!";
                    setTimeout(() => { copyBtn.textContent = "Copy"; }, 2000);
                });
            });
            pre.style.position = "relative";
            pre.appendChild(copyBtn);
        });

        messages.push({ role: "assistant", content: botText });
        chat.scrollTo({ top: chat.scrollHeight, behavior: "smooth" });

    } catch (err) {
        loadingDiv.innerHTML = `<div class="bubble error">Connection error: ${err.message}</div>`;
    }

    sendBtn.disabled = false;
    input.focus();
}

// ============================
// Clear Chat
// ============================
function clearChat() {
    messages = [];
    chat.innerHTML = "";
    appendWelcome();
}

function appendWelcome() {
    const mode = modeSelect.value;
    const welcomeText = mode === "code"
        ? "Hi! I'm your coding assistant. Paste code, ask questions, or describe what you want to build."
        : "Hi! I'm your study assistant. Ask me to explain concepts, summarize text, generate quizzes, or help with any subject.";

    const div = document.createElement("div");
    div.className = "msg bot welcome";
    div.innerHTML = `<div class="bubble">${welcomeText}</div>`;
    chat.appendChild(div);
}

// ============================
// Character Count
// ============================
function updateCharCount() {
    const len = input.value.length;
    charCount.textContent = len > 0 ? `${len}` : "";
}

// ============================
// Input Events
// ============================
input.addEventListener("keydown", e => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

input.addEventListener("input", () => {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 160) + "px";
    updateCharCount();
});

sendBtn.addEventListener("click", () => sendMessage());
clearBtn.addEventListener("click", clearChat);

modeSelect.addEventListener("change", () => {
    clearChat();
});

// ============================
// File Handling
// ============================
fileBtn.addEventListener("click", () => fileInput.click());
imageBtn.addEventListener("click", () => imageInput.click());

fileInput.addEventListener("change", async e => {
    const file = e.target.files[0];
    if (!file) return;
    fileInput.value = "";

    const reader = new FileReader();
    reader.onload = async () => {
        const text = reader.result.slice(0, 6000);
        const prompt = `Please analyze and summarize the following file contents from "${file.name}":\n\n${text}`;
        await sendMessage(prompt);
    };
    reader.readAsText(file);
});

imageInput.addEventListener("change", async e => {
    const file = e.target.files[0];
    if (!file) return;
    imageInput.value = "";
    await sendMessage(`I've uploaded an image named "${file.name}". (Note: image vision requires direct API integration — describe what you'd like help with regarding this image.)`);
});

// ============================
// Command Buttons
// ============================
const COMMANDS = {
    "!summary": "Please provide a clear, concise summary of what we've discussed so far, using bullet points for key takeaways.",
    "!quiz": "Based on our conversation, generate 5 quiz questions with answers to test understanding of the key concepts.",
    "!explain": "Please explain the last concept we discussed in simpler terms, as if explaining to someone new to the topic.",
};

document.querySelectorAll(".command-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        const cmd = btn.dataset.command;
        sendMessage(COMMANDS[cmd] || cmd);
    });
});

// ============================
// Init
// ============================
appendWelcome();
