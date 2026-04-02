@echo off
chcp 65001 >nul
echo ========================================
echo DEM 业务体验监控系统 - 停止脚本
echo ========================================
echo.

echo [停止] 正在停止所有 Node.js 进程...

taskkill /F /FI "WINDOWTITLE eq DEM-*" 2>nul
taskkill /F /FI "WINDOWTITLE eq node*" 2>nul

echo.
echo 所有服务已停止。
echo.
pause
