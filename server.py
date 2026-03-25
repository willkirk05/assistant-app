from flask import Flask, request, jsonify, send_from_directory
import os

app = Flask(__name__, static_folder=".")

# lightweight memory for context (just store last few messages)
memory = []

MAX_MEMORY = 6

def simple_response(message):
    """Basic placeholder responses for commands."""
    lower = message.lower()

    if lower.startswith("!summary"):
        text = message[len("!summary "):].strip()
        # simple local "summary" placeholder: first 2 sentences
        sentences = text.split(".")
        return ". ".join(sentences[:2]) + ("" if len(sentences) <= 2 else "...")
    elif lower.startswith("!quiz"):
        return "1) What is X?\n2) How does Y work?\n3) Explain Z."
    elif lower.startswith("!code"):
        return "# Example code:\nprint('Hello World')"
    elif lower.startswith("!image"):
        return f"Image '{message[len('!image '):]}' processed (placeholder)."
    else:
        # default response
        return f"I received your message: '{message}'. (This is a local placeholder response.)"

@app.route("/chat", methods=["POST"])
def chat():
    data = request.get_json()
    user_msg = data.get("message", "")

    # store memory
    memory.append(user_msg)
    if len(memory) > MAX_MEMORY:
        memory.pop(0)

    response_text = simple_response(user_msg)
    return jsonify({"response": response_text})

# serve static files
@app.route("/", defaults={"path": "index.html"})
@app.route("/<path:path>")
def serve_file(path):
    return send_from_directory(".", path)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)