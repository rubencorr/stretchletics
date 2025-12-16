#!/bin/bash

# Navigate to the project root directory
cd "$(dirname "$0")/.."

# Load environment variables from .env if present (exports variables)
if [ -f .env ]; then
	set -a
	# shellcheck disable=SC1091
	source .env
	set +a
fi

# Normalize OPENAI key variables: support OPENAI_KEY or OPENAI_API_KEY
if [ -z "${OPENAI_API_KEY:-}" ] && [ -n "${OPENAI_KEY:-}" ]; then
	export OPENAI_API_KEY="$OPENAI_KEY"
fi

# If no API key is present, show clear instructions and exit
if [ -z "${OPENAI_API_KEY:-}" ]; then
	cat <<'EOF'
Error: OpenAI API key not found.

Provide a key by either:
	1) Creating a `.env` file at the project root containing:
			 OPENAI_KEY=sk-...

	2) Exporting the variable in your shell before running this script:
			 export OPENAI_API_KEY=sk-...

	3) Or set both (some helpers expect OPENAI_KEY):
			 echo "OPENAI_KEY=sk-..." > .env

Then re-run: ./config/run.sh

See https://platform.openai.com/account/api-keys for obtaining a key.
EOF
	exit 1
fi

# Activate the virtual environment using the Mac/Unix activation script
if [ -f .venv/bin/activate ]; then
	# shellcheck disable=SC1091
	source .venv/bin/activate
else
	echo "Warning: virtualenv activate script not found at .venv/bin/activate. Activate your environment manually before running the app."
fi

# Execute the main application
python src/backend/app.py

# The 'pause' command is removed as it's Windows-specific.
# If you want the terminal to stay open after the script finishes, 
# you should launch it from a new terminal window rather than running 
# the script directly from an existing terminal.
