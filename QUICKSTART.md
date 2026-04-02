# DEM 业务体验监控 - 快速入门指南

## 快速启动

### 1. 安装依赖

```bash
npm install
```

### 2. 初始化数据库

```bash
# 进入服务器目录
cd server

# 生成 Prisma 客户端
npm run db:generate

# 推送数据库结构 (开发环境)
npm run db:push

# 创建初始管理员账户
npm run db:seed
```

默认管理员账户：
- **邮箱**: admin@dem.com
- **密码**: Admin@123
- **角色**: SUPER_ADMIN

⚠️ **首次登录后请立即修改密码！**

### 3. 配置环境变量

创建 `server/.env` 文件：

```bash
# 服务端口
PORT=3000
HOST=0.0.0.0

# JWT 密钥（生产环境请修改）
JWT_SECRET=your-secret-key-change-in-production

# 数据库连接
DATABASE_URL=postgresql://user:password@localhost:5432/dem_monitoring

# 邮件配置（可选）
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=user@example.com
SMTP_PASS=password
```

### 4. 启动开发环境

```bash
# 启动所有服务（服务器 + 探针 + Web）
npm run dev
```

或单独启动：

```bash
# 启动服务器（端口 3000）
npm run dev:server

# 启动探针
npm run dev:agent

# 启动 Web 仪表板（端口 5173）
npm run dev:web
```

### 5. 访问系统

- **Web 仪表板**: http://localhost:5173
- **API 服务**: http://localhost:3000/api
- **健康检查**: http://localhost:3000/api/health

## API 使用示例

### 获取认证 Token

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@dem.com",
    "password": "Admin@123"
  }'
```

返回：
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": "7d",
    "user": {
      "id": "user_id",
      "email": "admin@dem.com",
      "name": "System Administrator",
      "role": "SUPER_ADMIN"
    }
  }
}
```

### 创建监控任务

```bash
curl -X POST http://localhost:3000/api/monitors \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "name": "Google 首页监控",
    "type": "HTTPS",
    "target": "https://www.google.com",
    "interval": 60,
    "timeout": 30,
    "regions": ["beijing", "shanghai"],
    "config": {
      "method": "GET",
      "expectedStatusCode": 200
    },
    "alertRules": [
      {
        "name": "服务宕机告警",
        "type": "DOWN",
        "condition": { "threshold": 3 },
        "notificationChannels": ["EMAIL"],
        "enabled": true
      }
    ]
  }'
```

### 创建 Ping 监控

```bash
curl -X POST http://localhost:3000/api/monitors \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer demo" \
  -d '{
    "name": "Google DNS Ping",
    "type": "PING",
    "target": "8.8.8.8",
    "interval": 30,
    "config": {
      "count": 4
    }
  }'
```

### 创建 DNS 监控

```bash
curl -X POST http://localhost:3000/api/monitors \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer demo" \
  -d '{
    "name": "Google DNS 解析监控",
    "type": "DNS",
    "target": "www.google.com",
    "interval": 60,
    "config": {
      "recordType": "A",
      "expectedIP": "142.250.x.x"
    }
  }'
```

### 创建 TraceRoute 监控

```bash
curl -X POST http://localhost:3000/api/monitors \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer demo" \
  -d '{
    "name": "到 Google 的路由追踪",
    "type": "TRACEROUTE",
    "target": "www.google.com",
    "interval": 300,
    "config": {
      "maxHops": 30,
      "protocol": "ICMP"
    }
  }'
```

### 创建 TCP 端口监控

```bash
curl -X POST http://localhost:3000/api/monitors \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer demo" \
  -d '{
    "name": "Google HTTPS 端口监控",
    "type": "TCP",
    "target": "www.google.com:443",
    "interval": 60,
    "config": {
      "port": 443
    }
  }'
```

### 创建告警规则

```bash
curl -X POST http://localhost:3000/api/alerts/rules \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer demo" \
  -d '{
    "name": "服务宕机告警",
    "condition": {
      "type": "DOWN",
      "threshold": 3
    },
    "channels": ["email", "webhook"],
    "recipients": [
      "admin@example.com",
      "https://hooks.slack.com/services/xxx"
    ],
    "enabled": true
  }'
```

## 探针部署

### 本地测试

```bash
# 设置环境变量
export SERVER_URL=http://localhost:3000
export PROBE_NAME=local-test
export LOCATION=Beijing

# 启动探针
npm run dev:agent
```

### 远程部署

1. 构建探针：
```bash
npm run build --workspace=@synthetic-monitoring/agent
```

2. 复制 `agent/dist` 到目标服务器

3. 创建 `.env` 文件：
```
SERVER_URL=https://your-server.com
PROBE_NAME=beijing-node-1
LOCATION=Beijing,China
```

4. 启动：
```bash
node dist/index.js
```

## 配置说明

### 服务器配置 (server/.env)

```bash
# 服务端口
PORT=3000
HOST=0.0.0.0

# 数据库连接
DATABASE_URL=postgresql://user:password@localhost:5432/dem_monitoring

# JWT 密钥（生产环境请修改）
JWT_SECRET=your-secret-key-change-in-production

# 日志级别
LOG_LEVEL=info

# 邮件配置（可选）
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=user@example.com
SMTP_PASS=password
SMTP_FROM=noreply@example.com
```

### 探针配置 (agent/.env)

```bash
# 服务器地址
SERVER_URL=http://localhost:3000

# 探针名称
PROBE_NAME=beijing-node-1

# 地理位置
LOCATION=Beijing,China

# 日志级别
LOG_LEVEL=info
```

## 监控类型配置

### HTTP/HTTPS 监控配置

```json
{
  "method": "GET",
  "headers": {
    "User-Agent": "DEM-Monitor/1.0"
  },
  "expectedStatusCode": 200,
  "expectedBodyContains": "welcome",
  "followRedirects": true,
  "validateSSL": true
}
```

### API 监控配置（POST 示例）

```json
{
  "method": "POST",
  "headers": {
    "Content-Type": "application/json"
  },
  "body": "{\"query\":\"test\"}",
  "expectedStatusCode": 200
}
```

### Ping 监控配置

```json
{
  "count": 4,
  "packetSize": 56
}
```

### DNS 监控配置

```json
{
  "recordType": "A",
  "expectedIP": "1.2.3.4",
  "nameserver": "8.8.8.8"
}
```

### TraceRoute 监控配置

```json
{
  "maxHops": 30,
  "protocol": "ICMP"
}
```

### TCP 监控配置

```json
{
  "port": 443,
  "expectedResponse": ""
}
```

### UDP 监控配置

```json
{
  "port": 53,
  "message": "ping",
  "expectedResponse": "pong"
}
```

### FTP 监控配置

```json
{
  "port": 21,
  "username": "anonymous",
  "password": "anonymous@",
  "expectedResponse": ""
}
```

## 告警条件类型

### DOWN - 服务宕机

```json
{
  "type": "DOWN",
  "threshold": 3  // 连续失败 3 次后触发
}
```

### RESPONSE_TIME - 响应时间

```json
{
  "type": "RESPONSE_TIME",
  "operator": ">",  // 或 "<"
  "threshold": 5000  // 响应时间超过 5000ms
}
```

### SSL_EXPIRY - SSL 证书过期

```json
{
  "type": "SSL_EXPIRY",
  "daysBefore": 30  // 证书 30 天内过期时触发
}
```

### CHANGE - 内容变化

```json
{
  "type": "CHANGE",
  "field": "body"  // 或 "statusCode", "headers", "content"
}
```

## 通知渠道

### 邮件通知

```json
{
  "channels": ["email"],
  "recipients": ["admin@example.com"]
}
```

### Webhook 通知

```json
{
  "channels": ["webhook"],
  "recipients": ["https://hooks.slack.com/services/xxx"]
}
```

### URL 回调

```json
{
  "channels": ["url"],
  "recipients": ["https://example.com/alert?token=xxx"]
}
```

## 故障排除

### 查看日志

```bash
# 服务器日志
tail -f server/logs/server.log
tail -f server/logs/server-error.log

# 探针日志
tail -f agent/logs/agent.log
tail -f agent/logs/agent-error.log
```

### 检查服务状态

```bash
# 健康检查
curl http://localhost:3000/api/health

# 查看探针列表
curl http://localhost:3000/api/probes \
  -H "Authorization: Bearer demo"

# 查看监控任务
curl http://localhost:3000/api/monitors \
  -H "Authorization: Bearer demo"
```

### 测试监控

```bash
# 手动触发监控（需要实现此功能）
curl -X POST http://localhost:3000/api/monitors/xxx/test \
  -H "Authorization: Bearer demo"
```

## 生产环境部署

### Docker 部署（待实现）

```bash
# 构建镜像
docker build -t dem-server ./server
docker build -t dem-agent ./agent

# 运行服务器
docker run -d -p 3000:3000 \
  -e DATABASE_URL=postgresql://... \
  dem-server

# 运行探针
docker run -d \
  -e SERVER_URL=https://your-server.com \
  dem-agent
```

### Kubernetes 部署（待实现）

```yaml
# 后续添加 K8s 配置文件
```

---

**文档更新时间**: 2026-03-31
**版本**: 1.0.0
