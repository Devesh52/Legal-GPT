# app.py
from flask import Flask, request, jsonify, g, session
from flask_cors import CORS
import os
import requests # For making HTTP requests to Azure Foundry
import sqlite3
from werkzeug.security import generate_password_hash, check_password_hash
import datetime

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "dev_secret_key")
# Allow CORS for local Next.js frontend
CORS(app, resources={r"/*": {"origins": ["http://localhost:3000", "*"]}}, supports_credentials=True)

DATABASE = os.path.join(os.path.dirname(__file__), 'legalgpt.db')

def get_db():
    if 'db' not in g:
        g.db = sqlite3.connect(DATABASE)
        g.db.row_factory = sqlite3.Row
    return g.db

@app.teardown_appcontext
def close_db(error):
    db = g.pop('db', None)
    if db is not None:
        db.close()

def init_db():
    db = get_db()
    db.executescript('''
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS chats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        prompt TEXT NOT NULL,
        response TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
    );
    ''')
    db.commit()

with app.app_context():
    init_db()

@app.route('/signup', methods=['POST'])
def signup():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    if not username or not password:
        return jsonify({'error': 'Username and password required.'}), 400
    db = get_db()
    try:
        db.execute(
            'INSERT INTO users (username, password_hash) VALUES (?, ?)',
            (username, generate_password_hash(password))
        )
        db.commit()
        return jsonify({'message': 'Signup successful.'}), 201
    except sqlite3.IntegrityError:
        return jsonify({'error': 'Username already exists.'}), 409

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    if not username or not password:
        return jsonify({'error': 'Username and password required.'}), 400
    db = get_db()
    user = db.execute('SELECT * FROM users WHERE username = ?', (username,)).fetchone()
    if user and check_password_hash(user['password_hash'], password):
        session['user_id'] = user['id']
        return jsonify({'message': 'Login successful.', 'user_id': user['id'], 'username': username}), 200
    else:
        return jsonify({'error': 'Invalid username or password.'}), 401

@app.route('/logout', methods=['POST'])
def logout():
    session.pop('user_id', None)
    return jsonify({'message': 'Logged out.'}), 200

@app.route('/chat_history', methods=['GET'])
def chat_history():
    user_id = request.args.get('user_id')
    if not user_id:
        return jsonify({'error': 'User ID required.'}), 400
    db = get_db()
    chats = db.execute(
        'SELECT id, prompt, response, timestamp FROM chats WHERE user_id = ? ORDER BY timestamp DESC',
        (user_id,)
    ).fetchall()
    chat_list = [dict(chat) for chat in chats]
    return jsonify({'chats': chat_list}), 200

# --- Azure Foundry GPT Model Configuration ---
# IMPORTANT: Replace these with your actual Azure Foundry details
# These should ideally be stored as environment variables in Azure App Service
AZURE_FOUNDRY_ENDPOINT = os.environ.get("AZURE_FOUNDRY_ENDPOINT", "YOUR_AZURE_FOUNDRY_MODEL_ENDPOINT")
AZURE_FOUNDRY_API_KEY = os.environ.get("AZURE_FOUNDRY_API_KEY", "YOUR_AZURE_FOUNDRY_API_KEY")
# Use correct headers for Azure OpenAI
AZURE_FOUNDRY_HEADERS = {
    "Content-Type": "application/json",
    "api-key": AZURE_FOUNDRY_API_KEY
}

@app.route('/ask', methods=['POST'])
def ask_gpt():
    """
    Receives a prompt from the frontend, calls the Azure Foundry GPT model,
    and returns the model's response.
    """
    try:
        data = request.get_json()
        user_prompt = data.get('prompt')
        user_id = data.get('user_id')
        if not user_prompt or not isinstance(user_prompt, str):
            return jsonify({"error": "No prompt provided."}), 400
        if not user_id:
            return jsonify({"error": "User not authenticated."}), 401
        print(f"Received prompt: {user_prompt} from user_id: {user_id}")

        # --- Call Azure Foundry GPT Model ---
        # Use correct payload for Azure OpenAI /chat/completions
        payload = {
            "messages": [
                {"role": "user", "content": user_prompt}
            ],
            "max_tokens": 500,
            "temperature": 0.7
        }

        # Make the request to Azure Foundry
        response_from_foundry = requests.post(
            AZURE_FOUNDRY_ENDPOINT,
            headers=AZURE_FOUNDRY_HEADERS,
            json=payload
        )
        response_from_foundry.raise_for_status() # Raise an exception for HTTP errors (4xx or 5xx)

        foundry_data = response_from_foundry.json()
        print(f"Response from Foundry: {foundry_data}")

        # Extract the generated text. The structure depends on your model's output.
        ai_response_text = "No response extracted. Check Azure Foundry output structure."
        # Azure OpenAI /chat/completions returns choices[0].message.content
        if foundry_data and 'choices' in foundry_data and len(foundry_data['choices']) > 0:
            ai_response_text = foundry_data['choices'][0]['message'].get('content', ai_response_text)

        # Save chat to DB
        db = get_db()
        db.execute(
            'INSERT INTO chats (user_id, prompt, response) VALUES (?, ?, ?)',
            (user_id, user_prompt, ai_response_text)
        )
        db.commit()

        return jsonify({"response": ai_response_text}), 200

    except requests.exceptions.RequestException as req_err:
        print(f"Error communicating with Azure Foundry: {req_err}")
        return jsonify({"error": "Failed to get response from AI model. Please try again later."}), 500
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        return jsonify({"error": "An internal server error occurred. Please try again later."}), 500

@app.route('/')
def health_check():
    """Simple health check endpoint."""
    return jsonify({"status": "Flask backend is running!"}), 200

if __name__ == '__main__':
    # For local development, you can set environment variables directly or use a .env file
    # For production on Azure App Service, set these in the Application Settings.
    # Example:
    # os.environ["AZURE_FOUNDRY_ENDPOINT"] = "https://your-foundry-endpoint.azurewebsites.net/predict"
    # os.environ["AZURE_FOUNDRY_API_KEY"] = "your_api_key_here"

    app.run(debug=True, port=5000) # Run Flask app on port 5000
