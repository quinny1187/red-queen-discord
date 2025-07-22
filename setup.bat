@echo off
echo Setting up Red Queen Discord Bot...
echo.

:: Check if Node.js is installed
node --version > temp_node_check.txt 2>&1
if errorlevel 1 (
    del temp_node_check.txt 2>NUL
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)
del temp_node_check.txt 2>NUL

:: Install dependencies
echo Installing dependencies...
npm install
if errorlevel 1 (
    echo ERROR: Failed to install dependencies!
    pause
    exit /b 1
)

:: Copy .env.example to .env if it doesn't exist
if not exist .env (
    echo Creating .env file...
    copy .env.example .env
    echo.
    echo IMPORTANT: Please edit .env file and add your Discord bot token!
    echo.
)

:: Create necessary directories
echo Creating directories...
if not exist logs mkdir logs
if not exist message-queue mkdir message-queue

echo.
echo Setup complete!
echo.
echo Next steps:
echo 1. Edit .env file and add your Discord bot token
echo 2. Run 'npm start' or 'start.bat' to start the bot
echo.
pause