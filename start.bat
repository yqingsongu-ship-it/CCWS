@echo off
chcp 65001 >nul
echo ========================================
echo DEM 业务体验监控系统 - 启动脚本
echo ========================================
echo.

REM 检查 Node.js
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [错误] 未检测到 Node.js，请先安装 Node.js >= 20.16.0
    echo 下载地址：https://nodejs.org/
    pause
    exit /b 1
fi

echo [检查] Node.js 已安装
node --version
echo.

REM 初始化数据库
echo [初始化] 生成 Prisma 客户端...
cd server
call npx prisma generate
call npx prisma db push --accept-data-loss
call npx tsx src/scripts/seed.ts
cd ..

echo.
echo [启动] 中央服务器 (端口 3000)...
start "DEM-服务器" cmd /k "cd server && npm run dev"
timeout /t 8 /nobreak >nul

echo.
echo [启动] Web 仪表板 (端口 5173)...
start "DEM-Web 前端" cmd /k "cd web && npm run dev"

echo.
echo ========================================
echo 服务启动完成!
echo ========================================
echo.
echo 访问地址:
echo   - Web 仪表板：http://localhost:5173
echo   - API 服务：http://localhost:3000/api/health
echo.
echo 默认管理员账户:
echo   邮箱：admin@dem.com
echo   密码：Admin@123
echo.
echo 按任意键退出启动脚本...
pause >nul
