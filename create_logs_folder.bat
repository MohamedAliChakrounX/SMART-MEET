@echo off
REM Create logs folder and copy documentation

echo Creating logs folder...
mkdir "E:\sfm-PFE\Meeting-IA-sfm\logs" 2>nul

echo Copying documentation files...
copy "E:\sfm-PFE\Meeting-IA-sfm\START_HERE.md" "E:\sfm-PFE\Meeting-IA-sfm\logs\01_START_HERE.md" >nul
copy "E:\sfm-PFE\Meeting-IA-sfm\QUICK_START.md" "E:\sfm-PFE\Meeting-IA-sfm\logs\02_QUICK_START.md" >nul
copy "E:\sfm-PFE\Meeting-IA-sfm\SETUP_COMMANDS.md" "E:\sfm-PFE\Meeting-IA-sfm\logs\03_SETUP_COMMANDS.md" >nul
copy "E:\sfm-PFE\Meeting-IA-sfm\FIX_401_ERROR.md" "E:\sfm-PFE\Meeting-IA-sfm\logs\04_FIX_401_ERROR.md" >nul
copy "E:\sfm-PFE\Meeting-IA-sfm\AUTHENTICATION_GUIDE.md" "E:\sfm-PFE\Meeting-IA-sfm\logs\05_AUTHENTICATION_GUIDE.md" >nul
copy "E:\sfm-PFE\Meeting-IA-sfm\HEALTH_CHECK.md" "E:\sfm-PFE\Meeting-IA-sfm\logs\06_HEALTH_CHECK.md" >nul
copy "E:\sfm-PFE\Meeting-IA-sfm\GETTING_STARTED.md" "E:\sfm-PFE\Meeting-IA-sfm\logs\07_GETTING_STARTED.md" >nul
copy "E:\sfm-PFE\Meeting-IA-sfm\README.md" "E:\sfm-PFE\Meeting-IA-sfm\logs\08_README.md" >nul
copy "E:\sfm-PFE\Meeting-IA-sfm\SESSION_SUMMARY.md" "E:\sfm-PFE\Meeting-IA-sfm\logs\09_SESSION_SUMMARY.md" >nul
copy "E:\sfm-PFE\Meeting-IA-sfm\DOCUMENTATION_INDEX.md" "E:\sfm-PFE\Meeting-IA-sfm\logs\10_DOCUMENTATION_INDEX.md" >nul
copy "E:\sfm-PFE\Meeting-IA-sfm\BUG_FIXES_SUMMARY.md" "E:\sfm-PFE\Meeting-IA-sfm\logs\11_BUG_FIXES_SUMMARY.md" >nul
copy "E:\sfm-PFE\Meeting-IA-sfm\ALL_BUGS_FIXED.md" "E:\sfm-PFE\Meeting-IA-sfm\logs\12_ALL_BUGS_FIXED.md" >nul

echo.
echo ====================================
echo ✅ Dossier logs créé avec succès!
echo ====================================
echo.
echo Fichiers créés:
echo - 01_START_HERE.md
echo - 02_QUICK_START.md
echo - 03_SETUP_COMMANDS.md
echo - 04_FIX_401_ERROR.md
echo - 05_AUTHENTICATION_GUIDE.md
echo - 06_HEALTH_CHECK.md
echo - 07_GETTING_STARTED.md
echo - 08_README.md
echo - 09_SESSION_SUMMARY.md
echo - 10_DOCUMENTATION_INDEX.md
echo - 11_BUG_FIXES_SUMMARY.md
echo - 12_ALL_BUGS_FIXED.md
echo.
echo Commencez par lire:
echo logs\01_START_HERE.md
echo.
pause
