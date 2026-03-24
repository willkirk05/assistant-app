const chat = document.getElementById("chat");
const fileInput = document.getElementById("fileInput");
const imageInput = document.getElementById("imageInput");
const analyzeBtn = document.getElementById("analyzeFileBtn");

// Load messages from localStorage
let messages = JSON.parse(localStorage.getItem("messages")) || [
    { role: "system", content: "You are a helpful AI school assistant. Answer questions clearly and concisely, and analyze uploaded files or images if provided." }
];

// Render previous messages on load
messages.forEach(msg => renderMessage(msg));

function renderMessage(msg) {
    let content = msg.content;
    if (msg.type === "image") {
        content = `<img src="${msg.content}" alt="Uploaded Image">`;
    } else if (msg.type === "file") {
        content = `<a href="${msg.content}" download>${msg.name || 'File'}</a>`;
    }
    if (msg.role === "user") {
        chat.innerHTML += `<div class="user"><b>You:</b> ${content}</div>`;
    } else if (msg.role === "assistant") {
        chat.innerHTML += `<div class="bot"><b>Claude:</b> ${content}</div>`;
    }
    chat.scrollTop = chat.scrollHeight;
}

async function sendMessage() {
    const input = document.getElementById("input");
    const model = document.getElementById("modelSelect").value;
    const userText = input.value.trim();

    if (!userText) return;

    messages.push({ role: "user", content: userText });
    renderMessage({ role: "user", content: userText });
    input.value = "";

    streamClaude(model);
}

async function streamClaude(model) {
    const loadingId = "loading-" + Date.now();
    chat.innerHTML += `<div id="${loadingId}" class="bot">Claude is thinking...</div>`;
    chat.scrollTop = chat.scrollHeight;

    try {
        const response = await puter.ai.chat(messages, { model: model, stream: true });
        let botText = "";
        for await (const part of response) {
            botText += part?.text || "";
            document.getElementById(loadingId).innerHTML = `<b>Claude:</b> ${botText}`;
            chat.scrollTop = chat.scrollHeight;
        }
        messages.push({ role: "assistant", content: botText });
        saveMessages();
    } catch (err) {
        console.error(err);
        document.getElementById(loadingId).innerHTML = `Error: ${err.message}`;
    }
}

function saveMessages() {
    localStorage.setItem("messages", JSON.stringify(messages));
}

// Enter = send, Shift+Enter = newline
document.getElementById("input").addEventListener("keypress", function(e) {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

// Enable analyze button if a file is selected
fileInput.addEventListener("change", () => {
    analyzeBtn.disabled = !fileInput.files.length;
});

// Manual file analysis
async function analyzeFile() {
    const file = fileInput.files[0];
    if (!file) return;

    let textContent = "";

    if (file.type === "application/pdf") {
        const pdf = await pdfjsLib.getDocument(URL.createObjectURL(file)).promise;
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            textContent += content.items.map(item => item.str).join(" ") + "\n";
        }
    } else {
        textContent = await file.text();
    }

    // Show file message
    messages.push({ role: "user", content: textContent, type: "file", name: file.name });
    renderMessage({ role: "user", content: URL.createObjectURL(file), type: "file", name: file.name });

    // Ask Claude to summarize/highlight
    const loadingId = "loading-" + Date.now();
    chat.innerHTML += `<div id="${loadingId}" class="bot">Claude is analyzing file...</div>`;
    chat.scrollTop = chat.scrollHeight;

    try {
        const model = document.getElementById("modelSelect").value;
        const summaryResponse = await puter.ai.chat(
            [...messages, { role: "user", content: `Please summarize and highlight key points from the above file for school purposes.` }],
            { model: model, stream: true }
        );
        let botText = "";
        for await (const part of summaryResponse) {
            botText += part?.text || "";
            document.getElementById(loadingId).innerHTML = `<b>Claude:</b> ${botText}`;
            chat.scrollTop = chat.scrollHeight;
        }
        messages.push({ role: "assistant", content: botText });
        saveMessages();
    } catch (err) {
        console.error(err);
        document.getElementById(loadingId).innerHTML = `Error: ${err.message}`;
    }
    fileInput.value = "";
    analyzeBtn.disabled = true;
}