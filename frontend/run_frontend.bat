@echo off
cd /d %~dp0
echo --- GestureFlow frontend ---
call npm install
call npm run dev
pause
