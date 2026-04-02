@echo off
REM DEM 监控系统测试脚本 (Windows 版本)

SET BASE_URL=http://localhost:3000
SET AUTH=Authorization: Bearer demo
SET CONTENT=Content-Type: application/json

echo ========================================
echo DEM 监控系统功能测试
echo ========================================
echo.

REM 1. 健康检查
echo [1] 健康检查...
curl -s "%BASE_URL%/api/health"
echo.
echo.

REM 2. 创建 HTTPS 监控
echo [2] 创建 HTTPS 监控...
curl -s -X POST "%BASE_URL%/api/monitors" ^
  -H "%CONTENT%" -H "%AUTH%" ^
  -d "{\"name\":\"HTTPS 测试 - 百度\",\"type\":\"HTTPS\",\"target\":\"https://www.baidu.com\",\"interval\":60,\"timeout\":10000,\"config\":{\"method\":\"GET\",\"expectedStatusCode\":200}}"
echo.
echo.

REM 3. 创建 Ping 监控
echo [3] 创建 Ping 监控...
curl -s -X POST "%BASE_URL%/api/monitors" ^
  -H "%CONTENT%" -H "%AUTH%" ^
  -d "{\"name\":\"Ping 测试 - Google DNS\",\"type\":\"PING\",\"target\":\"8.8.8.8\",\"interval\":30,\"config\":{\"count\":4}}"
echo.
echo.

REM 4. 创建 DNS 监控
echo [4] 创建 DNS 监控...
curl -s -X POST "%BASE_URL%/api/monitors" ^
  -H "%CONTENT%" -H "%AUTH%" ^
  -d "{\"name\":\"DNS 测试 - 百度解析\",\"type\":\"DNS\",\"target\":\"www.baidu.com\",\"interval\":60,\"config\":{\"recordType\":\"A\"}}"
echo.
echo.

REM 5. 创建 TCP 监控
echo [5] 创建 TCP 监控...
curl -s -X POST "%BASE_URL%/api/monitors" ^
  -H "%CONTENT%" -H "%AUTH%" ^
  -d "{\"name\":\"TCP 测试 - 百度 443 端口\",\"type\":\"TCP\",\"target\":\"www.baidu.com:443\",\"interval\":60,\"config\":{\"port\":443}}"
echo.
echo.

REM 6. 创建 TraceRoute 监控
echo [6] 创建 TraceRoute 监控...
curl -s -X POST "%BASE_URL%/api/monitors" ^
  -H "%CONTENT%" -H "%AUTH%" ^
  -d "{\"name\":\"TraceRoute 测试\",\"type\":\"TRACEROUTE\",\"target\":\"www.baidu.com\",\"interval\":300,\"config\":{\"maxHops\":30}}"
echo.
echo.

REM 7. 获取所有监控任务
echo [7] 获取所有监控任务...
curl -s "%BASE_URL%/api/monitors" -H "%AUTH%"
echo.
echo.

REM 8. 创建告警规则
echo [8] 创建告警规则 (DOWN)...
curl -s -X POST "%BASE_URL%/api/alerts/rules" ^
  -H "%CONTENT%" -H "%AUTH%" ^
  -d "{\"name\":\"服务宕机告警\",\"condition\":{\"type\":\"DOWN\",\"threshold\":3},\"channels\":[\"webhook\"],\"recipients\":[\"https://httpbin.org/post\"],\"enabled\":true}"
echo.
echo.

REM 9. 获取告警规则
echo [9] 获取所有告警规则...
curl -s "%BASE_URL%/api/alerts/rules" -H "%AUTH%"
echo.
echo.

REM 10. 获取探针列表
echo [10] 获取探针列表...
curl -s "%BASE_URL%/api/probes" -H "%AUTH%"
echo.
echo.

REM 11. 获取告警统计
echo [11] 获取告警统计...
curl -s "%BASE_URL%/api/alerts/stats" -H "%AUTH%"
echo.
echo.

echo ========================================
echo 测试完成!
echo ========================================
