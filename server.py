from flask import Flask, request, jsonify, send_from_directory
import os
from dotenv import load_dotenv
import anthropic

# ----------------------------
# Load environment variables
# ----------------------------
load_dotenv(override=True)
client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

# ----------------------------
# Flask app setup
# ----------------------------
app = Flask(__name__, static_folder=".")

# ----------------------------
# Mode-based system prompts
# ----------------------------
SYSTEM_PROMPTS = {
    "school": (
        "You are a knowledgeable and encouraging student assistant. "
        "Explain concepts clearly and pedagogically. Break down complex topics step by step, "
        "use relatable examples, and check for understanding. Format your responses with "
        "markdown where helpful — use headers, bullet points, and bold for key terms."
    ),
    "code": (
        "You are an expert coding assistant. Provide clean, well-structured code with "
        "clear explanations. Always use markdown code blocks with the appropriate language tag. "
        "Explain your implementation choices and suggest best practices. Point out potential "
        "edge cases or improvements when relevant."
    ),
}

# ----------------------------
# Offline fallback
# ----------------------------
def simple_response(message):
    lower = message.lower()
    if "summary" in lower or lower.startswith("!summary"):
        return "**Offline mode:** Paste your text and ask me to summarize it once you're online."
    elif "quiz" in lower or lower.startswith("!quiz"):
        return "**Offline mode:** Connect to Claude to generate quiz questions from your material."
    elif "code" in lower or lower.startswith("!code"):
        return "```python\n# Offline mode — connect to Claude for real code assistance\nprint('Hello, World!')\n```"
    else:
        return f"**Offline mode:** I received your message. Switch to Online mode to get a real response from Claude."

# ----------------------------
# Flask endpoint
# ----------------------------
@app.route("/chat", methods=["POST"])
def chat():
    data = request.get_json()
    model = data.get("model", "claude-sonnet-4-6")
    mode = data.get("mode", "school")
    api_mode = data.get("api_mode", "online")
    history = data.get("history", [])  # [{role, content}, ...]

    # history already includes the current user message as the last entry
    if not history:
        return jsonify({"response": "No message received."})

    last_message = history[-1].get("content", "")

    if api_mode == "offline":
        return jsonify({"response": simple_response(last_message)})

    system_prompt = SYSTEM_PROMPTS.get(mode, SYSTEM_PROMPTS["school"])

    # Anthropic requires alternating user/assistant roles — sanitize just in case
    messages = [{"role": m["role"], "content": m["content"]} for m in history]

    try:
        response = client.messages.create(
            model=model,
            max_tokens=1500,
            system=system_prompt,
            messages=messages,
        )
        return jsonify({"response": response.content[0].text})
    except Exception as e:
        print("Anthropic error:", e)
        return jsonify({"response": f"**Error connecting to Claude:** {str(e)}", "error": True})

# ----------------------------
# Serve static files
# ----------------------------
@app.route("/", defaults={"path": "index.html"})
@app.route("/<path:path>")
def serve_file(path):
    return send_from_directory(".", path)

# ----------------------------
# Run app
# ----------------------------
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)
