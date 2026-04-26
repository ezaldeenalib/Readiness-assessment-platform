@echo off
echo 🔍 البحث عن العمليات على المنفذ 3000...
echo.

for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
    echo 🛑 إيقاف العملية PID: %%a
    taskkill /PID %%a /F >nul 2>&1
)

echo.
echo ✅ تم إيقاف جميع العمليات على المنفذ 3000
echo.
echo يمكنك الآن تشغيل الـ server:
echo npm run server
pause
