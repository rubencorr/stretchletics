# Stretchletics - Setup & Running Guide

## First Time Setup

1. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Create a `.env` file** in the root directory with your OpenAI API key:
   ```
   OPENAI_API_KEY=your_api_key_here
   ```

## Running the Application

### Option 1: Using Batch File (Windows)
Double-click `run.bat` in the project folder.

### Option 2: Using PowerShell
```powershell
cd C:\coding\stretchletics
.\.venv\Scripts\Activate.ps1
python app.py
```

The application will start at `http://localhost:5000`

## Project Structure

- **`app.py`** - Flask web server (main entry point)
- **`chat/chat.py`** - Core chat logic with OpenAI integration
- **`chat/prompts.py`** - System prompt for the AI
- **`frontend/chat.html`** - Web interface
- **`requirements.txt`** - Python dependencies

## Key Components

- **Flask** - Web framework
- **Flask-CORS** - Handles cross-origin requests (important for browser compatibility)
- **OpenAI** - LLM for generating stretching routines

## Troubleshooting

**Port Already in Use:**
If port 5000 is already in use, modify the last line in `app.py`:
```python
app.run(debug=True, port=5001)  # Change 5000 to another port
```

**ModuleNotFoundError:**
Make sure you've activated the virtual environment and installed requirements:
```bash
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

**Chat not responding (405 error):**
This is usually a CORS issue. Make sure Flask-CORS is installed:
```bash
pip install flask-cors
```
