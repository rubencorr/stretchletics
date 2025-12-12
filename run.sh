#!/bin/bash

# Navigate to the script directory (equivalent to cd /d %~dp0)
cd "$(dirname "$0")"

# Activate the virtual environment using the Mac/Unix activation script
source .venv/bin/activate

# Execute the main application
python app.py

# The 'pause' command is removed as it's Windows-specific.
# If you want the terminal to stay open after the script finishes, 
# you should launch it from a new terminal window rather than running 
# the script directly from an existing terminal.


# .venv/bin/activate
# ./run.sh