@echo off
REM Meeting-IA-sfm Quick Start Script for Windows
REM This script sets up everything you need to run the application

echo.
echo ========================================
echo   Meeting-IA-sfm Quick Start
echo ========================================
echo.

REM Check if we're in the right directory
if not exist "composer.json" (
    echo Error: This script must be run from the Backend directory
    echo   cd Backend ^& setup.bat
    pause
    exit /b 1
)

REM Step 1: Install PHP dependencies
echo [1/5] Installing PHP dependencies...
call composer install
if errorlevel 1 (
    echo Warning: Composer install completed with warnings
)
echo.

REM Step 2: Create database
echo [2/5] Creating database...
php bin/console doctrine:database:create --if-not-exists >nul 2>&1
echo Done
echo.

REM Step 3: Run migrations
echo [3/5] Running migrations...
php bin/console doctrine:migrations:migrate --no-interaction
echo.

REM Step 4: Generate JWT keypair
echo [4/5] Generating JWT keypair...
php bin/console lexik:jwt:generate-keypair --skip-if-exists >nul 2>&1
echo Done
echo.

REM Step 5: Create test user
echo [5/5] Creating test user...
php bin/console app:create-test-user
echo.

echo ========================================
echo   Setup Complete!
echo ========================================
echo.
echo Login Credentials:
echo   Email: test@example.com
echo   Password: password123
echo.
echo Start the server:
echo   php -S localhost:8000 -t public
echo.
echo In another terminal, start the frontend:
echo   cd ..\Frontend-Web
echo   npm install
echo   npm run dev
echo.
echo Access the application:
echo   Frontend: http://localhost:5173
echo   Backend API: http://localhost:8000/api/v1
echo.
echo More info: See AUTHENTICATION_GUIDE.md
echo.
pause
