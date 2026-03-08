# Script لإيقاف جميع العمليات على المنفذ 3000
# Kill all processes on port 3000

Write-Host "🔍 البحث عن العمليات على المنفذ 3000..." -ForegroundColor Yellow

$processes = netstat -ano | findstr :3000 | findstr LISTENING

if ($processes) {
    $processes | ForEach-Object {
        $parts = $_ -split '\s+'
        $pid = $parts[-1]
        
        if ($pid -match '^\d+$') {
            Write-Host "🛑 إيقاف العملية PID: $pid" -ForegroundColor Red
            taskkill /PID $pid /F 2>$null
        }
    }
    Write-Host "✅ تم إيقاف جميع العمليات على المنفذ 3000" -ForegroundColor Green
} else {
    Write-Host "✅ لا توجد عمليات على المنفذ 3000" -ForegroundColor Green
}

Write-Host "`nيمكنك الآن تشغيل الـ server:" -ForegroundColor Cyan
Write-Host "npm run server" -ForegroundColor White
