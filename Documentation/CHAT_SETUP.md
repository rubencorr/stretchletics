# Stretchletics - Chat Integration Guide

## Setup Instructions

1. **Install dependencies** (Flask was just added):

   ```bash
   pip install -r requirements.txt
   ```

2. **Ensure your `.env` file has your OpenAI API key**:
   ```
   OPENAI_API_KEY=your_api_key_here
   ```

## Running the Application

Start the Flask server:

```bash
python app.py
```

The server will run on `http://localhost:5000`

- Open your browser and go to `http://localhost:5000`
- The chat interface will load from `chat.html`
- When you send a message in the chatbox, it will:
  1. Display your message on the right (user bubble)
  2. Send the message to the Python backend via `/api/chat` endpoint
  3. Call the OpenAI API through `chat.py`
  4. Display the AI response on the left (bot bubble)

## Project Structure

- **`app.py`**: Flask server that serves the HTML and handles `/api/chat` requests
- **`chat/chat.py`**: Core logic for calling OpenAI API with the system prompt
- **`chat/prompts.py`**: Contains the `SYSTEM_PROMPT` for the AI
- **`frontend/chat.html`**: The web interface with chat UI and frontend logic

## How It Works

1. User types a message in the chatbox
2. Frontend JavaScript sends it to `/api/chat` endpoint
3. Flask backend receives the request and calls `get_routine_response()` from `chat.py`
4. `chat.py` calls OpenAI's API with the user message
5. Response is returned to the frontend and displayed in the chat
