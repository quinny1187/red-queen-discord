@echo off
echo Starting Red Queen Discord Bot...
echo.

:: Check if .env exists
if not exist .env (
    echo ERROR: .env file not found!
    echo Please run setup.bat first and configure your bot token.
    pause
    exit /b 1
)

:: Build MCP server
echo Building MCP server...
cd mcp
call npm install
call npm run build
cd ..

:: Start the bot (which includes MCP)
echo Starting Discord bot...
npm start

:: If bot crashes, wait before closing
if errorlevel 1 (
    echo.
    echo Bot crashed! Check the logs for more information.
    pause
)