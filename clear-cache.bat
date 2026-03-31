@echo off
echo Clearing Vite Cache and Restarting...
echo.

echo Step 1: Stopping any running dev servers...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

echo Step 2: Deleting Vite cache...
if exist "node_modules\.vite" (
    rmdir /s /q "node_modules\.vite"
    echo Vite cache deleted!
) else (
    echo No Vite cache found.
)

echo Step 3: Deleting dist folder...
if exist "dist" (
    rmdir /s /q "dist"
    echo Dist folder deleted!
) else (
    echo No dist folder found.
)

echo.
echo Step 4: Cache cleared! Now run: npm run dev
echo.
pause
