# DEM 监控系统 - Windows 启动说明

## 方法一：使用启动脚本（推荐）

双击运行项目根目录下的 `start.bat` 文件。

脚本会自动：
1. 生成 Prisma 客户端
2. 初始化数据库
3. 创建管理员账户
4. 启动后端服务器
5. 启动前端应用

## 方法二：手动启动

打开 **Windows PowerShell** 或 **命令提示符 (cmd)**，然后执行：

### 1. 安装依赖（首次运行）

```powershell
cd D:\Working\CCWS
npm install
```

### 2. 初始化数据库

```powershell
cd server
npx prisma generate
npx prisma db push --accept-data-loss
npx tsx src/scripts/seed.ts
```

### 3. 启动后端服务器

```powershell
cd D:\Working\CCWS\server
npm run dev
```

等待看到 `Server started at http://0.0.0.0:3000` 消息。

### 4. 启动前端应用

打开**新的** PowerShell 或 cmd 窗口：

```powershell
cd D:\Working\CCWS\web
npm run dev
```

等待看到 `Local: http://localhost:5173/` 消息。

## 访问系统

- **Web 仪表板**: http://localhost:5173
- **API 健康检查**: http://localhost:3000/api/health

## 默认管理员账户

```
邮箱：admin@dem.com
密码：Admin@123
```

⚠️ **首次登录后请立即修改密码！**

## 常见问题

### 端口被占用

如果 3000 或 5173 端口被占用，修改配置文件：
- 服务器：`server/.env` 中的 `PORT=3000`
- 前端：`web/vite.config.ts` 中的 `port: 5173`

### npm 命令找不到

确保已安装 Node.js >= 18.x：
- 下载地址：https://nodejs.org/
- 安装后重启终端

### 数据库错误

删除 `server/prisma/dev.db` 重新运行：
```powershell
cd server
npx prisma db push --accept-data-loss
```

---

**提示**: 当前会话是 Git Bash 环境，npm 命令可能无法执行。
请在 **Windows PowerShell** 或 **命令提示符** 中运行上述命令。
