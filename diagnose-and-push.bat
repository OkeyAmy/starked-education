@echo off
echo ========================================
echo Git Diagnostic and Push Script
echo ========================================
echo.

echo [1/8] Current directory:
cd
echo.

echo [2/8] Current branch:
git branch
echo.

echo [3/8] Git status:
git status
echo.

echo [4/8] Recent commits:
git log --oneline -3
echo.

echo [5/8] Remote repositories:
git remote -v
echo.

echo ========================================
echo Now attempting to push...
echo ========================================
echo.

echo [6/8] Switching to feature/development branch...
git checkout feature/development 2>nul || git checkout -b feature/development
echo.

echo [7/8] Adding and committing files...
git add .
git commit -m "feat: Implement Smart Contract Wallet with ERC-4337"
echo.

echo [8/8] Pushing to GitHub...
git push -u origin feature/development
echo.

echo ========================================
echo Process Complete!
echo ========================================
echo.
echo If successful, go to:
echo https://github.com/jobbykings/starked-education/pulls
echo.
pause
