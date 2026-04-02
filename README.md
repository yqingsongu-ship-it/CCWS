# DEM - 业务体验监控 (Digital Experience Monitoring)

> 分布式合成监控系统 - 所有核心功能已完成 ✅

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)]()
[![License](https://img.shields.io/badge/License-MIT-yellow)]()

## 快速开始

### Windows 用户

**双击运行启动脚本**:
```
start.bat
```

然后访问：
- Web 仪表板：http://localhost:5173
- API 服务：http://localhost:3000/api/health

**停止服务**: 运行 `stop.bat`

### 手动启动

```bash
# 安装依赖
npm install

# 启动所有服务（服务器 + 探针 + Web）
npm run dev

# 访问 Web 仪表板
# http://localhost:5173
```

详细使用指南请查看 [QUICKSTART.md](./QUICKSTART.md)

## 功能特性

基于 Cloudwise Synthetic Monitoring (监控宝 6) 规格构建，所有监控类型已完成：

### 监控类型（全部完成）

| 类型 | 描述 | 状态 |
|------|------|------|
| **HTTP/HTTPS** | 网页可用性和性能监控 | ✅ 完成 |
| **API** | RESTful/SOAP API 监控 | ✅ 完成 |
| **Ping** | ICMP Ping 网络稳定性监控 | ✅ 完成 |
| **DNS** | DNS 解析监控 | ✅ 完成 |
| **TraceRoute** | 网络路径追踪和路由分析 | ✅ 完成 |
| **TCP** | TCP 端口可用性监控 | ✅ 完成 |
| **UDP** | UDP 服务监控 | ✅ 完成 |
| **FTP** | FTP 服务器可用性监控 | ✅ 完成 |

### 核心能力

- ✅ 分布式探针/代理架构
- ✅ 多地点实时监测
- ✅ 告警通知系统（邮件、Webhook、URL 回调）
- ✅ 仪表板和数据可视化
- ✅ 用户管理和权限控制
- ✅ API 认证
- ✅ 告警规则引擎（DOWN、RESPONSE_TIME、SSL_EXPIRY、CHANGE）

## 项目结构

```
D:\Working\CCWS/
├── server/                 # 中央管理服务器 (Express + TypeScript)
│   ├── src/
│   │   ├── api/           # REST API 路由
│   │   ├── controllers/   # 控制器
│   │   ├── services/      # 业务逻辑 (告警、邮件、Socket)
│   │   ├── database/      # 数据库配置
│   │   ├── middleware/    # 中间件
│   │   └── utils/         # 工具函数
│   ├── prisma/
│   │   └── schema.prisma  # 数据库模型
│   └── package.json
│
├── agent/                  # 探针代理 (部署在监测点)
│   ├── src/
│   │   ├── monitors/       # 9 种监控器实现
│   │   │   ├── http.monitor.ts
│   │   │   ├── ping.monitor.ts
│   │   │   ├── dns.monitor.ts
│   │   │   ├── tcp.monitor.ts
│   │   │   ├── traceroute.monitor.ts
│   │   │   ├── udp.monitor.ts
│   │   │   └── ftp.monitor.ts
│   │   ├── utils/
│   │   └── index.ts
│   └── package.json
│
├── web/                    # Web 仪表板 (Vue 3 + Ant Design Vue)
│   ├── src/
│   │   ├── views/
│   │   ├── stores/
│   │   └── main.ts
│   └── package.json
│
├── packages/
│   └── shared/            # 共享类型和工具
│       └── src/
│           └── types.ts   # TypeScript 类型定义
│
├── README.md              # 项目说明
├── QUICKSTART.md          # 快速入门指南
├── PROJECT_PLAN.md        # 项目详细计划
└── package.json           # Monorepo 配置
```

## 技术栈

- **后端**: Node.js + Express + TypeScript + Socket.IO
- **前端**: Vue 3 + Pinia + Vue Router + Ant Design Vue + ECharts
- **数据库**: PostgreSQL (via Prisma ORM) - 可选
- **通信**: WebSocket (Socket.IO) + REST API

## 构建状态

```bash
# 所有组件构建成功 ✅
$ npm run build

# @synthetic-monitoring/shared - ✅ 成功
# @synthetic-monitoring/agent    - ✅ 成功
# @synthetic-monitoring/server   - ✅ 成功
# @synthetic-monitoring/web      - ✅ 成功
```

## 快速测试

### 创建 HTTPS 监控

```bash
# 启动服务器
npm run dev:server

# 创建监控任务
curl -X POST http://localhost:3000/api/monitors \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer demo" \
  -d '{
    "name": "Google 首页监控",
    "type": "HTTPS",
    "target": "https://www.google.com",
    "interval": 60,
    "timeout": 10000,
    "config": {
      "method": "GET",
      "expectedStatusCode": 200
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
    "recipients": ["admin@example.com", "https://hooks.slack.com/services/xxx"]
  }'
```

更多 API 示例请查看 [QUICKSTART.md](./QUICKSTART.md)

## 配置说明

### 服务器配置 (server/.env)

```bash
# 服务端口
PORT=3000
HOST=0.0.0.0

# 数据库连接（可选，支持 mock 模式）
DATABASE_URL=postgresql://user:password@localhost:5432/dem_monitoring

# JWT Secret（生产环境请修改）
JWT_SECRET=your-secret-key-change-in-production

# 日志级别
LOG_LEVEL=info

# 邮件配置（告警通知）
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
PROBE_NAME=local-probe

# 地理位置
LOCATION=Beijing,China

# 日志级别
LOG_LEVEL=info
```

## 启动说明

### 开发模式

```bash
# 安装依赖
npm install

# 启动所有服务
npm run dev

# 或单独启动
npm run dev:server    # 中央服务器（端口 3000）
npm run dev:agent     # 探针
npm run dev:web       # Web 仪表板（端口 5173）
```

### 生产构建

```bash
npm run build

# 构建输出：
# - server/dist/      # 服务器编译文件
# - agent/dist/       # 探针编译文件
# - web/dist/         # Web 静态文件
```

## 系统架构

### 中央服务器 (Server)
- 管理监控任务和调度
- 处理探针注册和通信
- 存储监控结果和指标
- 提供 REST API 和 WebSocket 实时更新
- 管理告警和通知
- 邮件发送服务

### 探针 (Agent)
- 执行服务器分配的监控任务
- 支持 9 种监控类型
- 实时向服务器报告结果
- 可部署在 Windows 和 Linux 系统

### Web 仪表板 (Dashboard)
- 监控任务配置和管理
- 实时状态可视化
- 历史数据图表和报告
- 告警管理和通知配置
- 用户和权限管理

## 监控流程

1. 服务器调度监控任务到探针
2. 探针执行监控检查（支持 9 种类型）
3. 结果发送回服务器
4. 服务器存储结果并评估告警规则
5. 触发告警并发送通知（邮件/Webhook/URL）
6. 仪表板显示实时状态和历史数据

## 相关文档

- [QUICKSTART.md](./QUICKSTART.md) - 快速入门指南
- [PROJECT_PLAN.md](./PROJECT_PLAN.md) - 项目详细计划

## License

MIT

---
**更新时间**: 2026-03-31
**版本**: 1.0.0
