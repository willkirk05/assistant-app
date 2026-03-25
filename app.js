// core state for messages and lightweight memory
let messages = [
    { role: "system", content: "You are a helpful AI assistant for school tasks. be clear and professional." }
];

let currentMode = "school";
let memorySummary = "";
const MAX_CONTEXT = 6;

// dom references
const chat = document.getElementById("chat");
const input = document.getElementById("input");
const sendBtn = document.getElementById("sendBtn");
const modelSelect = document.getElementById("modelSelect");
const modeSelect = document.getElementById("modeSelect");
const fileBtn = document.getElementById("fileBtn");
const imageBtn = document.getElementById("imageBtn");
const fileInput = document.getElementById("fileInput");
const imageInput = document.getElementById("imageInput");

// create message bubble safely
function appendMessage(role, text) {
    const div = document.createElement("div");
    div.className = role;

    const label = document.createElement("b");
    label.textContent = role === "user" ? "You: " : "Assistant: ";

    const span = document.createElement("span");
    span.textContent = text;

    div.appendChild(label);
    div.appendChild(span);

    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;
}

// return trimmed context to reduce usage
function getRecentMessages() {
    return messages.slice(-MAX_CONTEXT);
}

// generate system prompt dynamically
function getSystemPrompt(userText) {
    if (userText.startsWith("!summary")) return "summarize the following text concisely.";
    if (userText.startsWith("!quiz")) return "generate a short quiz (3-5 questions).";
    if (userText.startsWith("!code") || currentMode === "code") {
        return "you are a coding assistant. respond with code and brief comments.";
    }
    return "you are a helpful AI assistant for school tasks.";
}

// lightweight summarization trigger
async function maybeSummarize() {
    if (messages.length < 12) return;

    try {
        const summaryPrompt = "summarize this conversation briefly in 2 sentences.";
        const response = await puter.ai.chat(
            [{ role: "user", content: summaryPrompt + JSON.stringify(messages.slice(0, 8)) }],
            { model: modelSelect.value }
        );

        memorySummary = response.text || response.content || "";
        messages = messages.slice(-MAX_CONTEXT);
    } catch (err) {
        console.error("summary failed", err);
    }
}

// send message to model
async function sendMessage(contentOverride) {
    const userText = contentOverride || input.value.trim();
    if (!userText) return;

    appendMessage("user", userText);
    input.value = "";

    messages.push({ role: "user", content: userText });

    const loadingDiv = document.createElement("div");
    loadingDiv.className = "bot loading";
    loadingDiv.textContent = "thinking...";
    chat.appendChild(loadingDiv);
    chat.scrollTop = chat.scrollHeight;

    const systemPrompt = getSystemPrompt(userText);

    const promptMessages = [
        { role: "system", content: systemPrompt },
        ...(memorySummary ? [{ role: "system", content: "previous context: " + memorySummary }] : []),
        ...getRecentMessages()
    ];

    try {
        const response = await puter.ai.chat(promptMessages, { model: modelSelect.value });
        const botText = response.text || response.content || "";

        loadingDiv.textContent = "";
        loadingDiv.classList.remove("loading");
        loadingDiv.innerHTML = `<b>Assistant:</b> ${botText}`;

        messages.push({ role: "assistant", content: botText });

        maybeSummarize();
    } catch (err) {
        loadingDiv.textContent = "error: " + err.message;
    }
}

// enter key behavior
input.addEventListener("keypress", e => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

// auto resize textarea
input.addEventListener("input", () => {
    input.style.height = "auto";
    input.style.height = input.scrollHeight + "px";
});

sendBtn.addEventListener("click", () => sendMessage());
modeSelect.addEventListener("change", () => currentMode = modeSelect.value);
fileBtn.addEventListener("click", () => fileInput.click());
imageBtn.addEventListener("click", () => imageInput.click());

// command buttons
document.querySelectorAll(".command-btn").forEach(btn => {
    btn.addEventListener("click", () => sendMessage(btn.dataset.command));
});

// file upload handling
fileInput.addEventListener("change", async e => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
        const text = reader.result.slice(0, 4000);

        appendMessage("bot", "processing file...");

        const prompt = `summarize:\n${text}`;

        const response = await puter.ai.chat([{ role: "user", content: prompt }], { model: modelSelect.value });
        appendMessage("bot", response.text || response.content || "");
    };

    reader.readAsText(file);
});

// image upload handling
imageInput.addEventListener("change", async e => {
    const file = e.target.files[0];
    if (!file) return;

    appendMessage("bot", "analyzing image...");

    const prompt = `describe an image named ${file.name}`;

    const response = await puter.ai.chat([{ role: "user", content: prompt }], { model: modelSelect.value });
    appendMessage("bot", response.text || response.content || "");
});