@REM To run this file, use: .\run.bat
@echo off
cd /d %~dp0
call .venv\Scripts\activate.bat
python src\backend\app.py
pause
