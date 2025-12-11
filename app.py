from flask import Flask, render_template, request, jsonify, send_from_directory
from flask_cors import CORS
import os
from chat.chat import get_routine_response
from dotenv import load_dotenv

load_dotenv()

# Get the directory where app.py is located
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
app = Flask(__name__, template_folder=os.path.join(BASE_DIR, 'frontend'), static_folder=os.path.join(BASE_DIR, 'frontend'))

# Enable CORS for all routes
CORS(app, resources={r"/api/*": {"origins": "*"}})

@app.route('/')
def home():
    return send_from_directory(app.template_folder, 'chat.html')

@app.route('/api/chat', methods=['POST'])
def chat():
    try:
        data = request.json
        user_message = data.get('message', '').strip()
        
        if not user_message:
            return jsonify({'error': 'No message provided'}), 400
        
        # Get response from chat.py
        response = get_routine_response(user_message)
        
        return jsonify({'response': response})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
