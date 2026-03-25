// core state
let messages = [];
let currentMode = "school";

const chat = document.getElementById("chat");
const input = document.getElementById("input");
const sendBtn = document.getElementById("sendBtn");
const modeSelect = document.getElementById("modeSelect");
const fileBtn = document.getElementById("fileBtn");
const imageBtn = document.getElementById("imageBtn");
const fileInput = document.getElementById("fileInput");
const imageInput = document.getElementById("imageInput");
const apiModeSelect = document.getElementById("apiModeSelect"); // NEW

// create message bubble
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

// send message (hybrid online/offline)
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

    try {
        let botText = "";

        if (apiModeSelect.value === "online") {
            // Call Claude via puter.ai
            const systemPrompt = currentMode === "code" ? "You are a coding assistant. Respond with code and brief comments." : "You are a helpful AI assistant for school tasks.";
            const response = await puter.ai.chat(
                [
                    { role: "system", content: systemPrompt },
                    ...messages.slice(-6)
                ],
                { model: document.getElementById("modelSelect").value }
            );
            botText = response.text || response.content || "";
        } else {
            // Call local Flask
            const res = await fetch("/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: userText })
            });
            const data = await res.json();
            botText = data.response || "";
        }

        loadingDiv.textContent = "";
        loadingDiv.classList.remove("loading");
        loadingDiv.innerHTML = `<b>Assistant:</b> ${botText}`;
        messages.push({ role: "assistant", content: botText });
    } catch (err) {
        loadingDiv.textContent = "error: " + err.message;
    }
}

// input events
input.addEventListener("keypress", e => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});
input.addEventListener("input", () => {
    input.style.height = "auto";
    input.style.height = input.scrollHeight + "px";
});
sendBtn.addEventListener("click", () => sendMessage());
modeSelect.addEventListener("change", () => currentMode = modeSelect.value);

// file & image upload
fileBtn.addEventListener("click", () => fileInput.click());
imageBtn.addEventListener("click", () => imageInput.click());

fileInput.addEventListener("change", async e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
        const text = reader.result.slice(0, 4000);
        appendMessage("bot", "processing file...");
        await sendMessage("!summary " + text);
    };
    reader.readAsText(file);
});

imageInput.addEventListener("change", async e => {
    const file = e.target.files[0];
    if (!file) return;
    appendMessage("bot", "analyzing image...");
    await sendMessage("!image " + file.name);
});

// command buttons
document.querySelectorAll(".command-btn").forEach(btn => {
    btn.addEventListener("click", () => sendMessage(btn.dataset.command));
});