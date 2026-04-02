# DEM 用户体验监控系统 - 完整实现计划

> 使用 superpowers writing-plans 技能深度规划，确保所有功能完整实现并通过测试

**生成时间**: 2026-04-02
**目标**: 完整的商用级 DEM 系统，非 Demo

---

## 一、需求分析总结

### 1.1 三大核心监控类型

| 类型 | 监控频率 | 核心功能 | 特殊需求 |
|------|----------|----------|----------|
| **网站监控** | 最快 1 分钟 | HTTP/HTTPS 可用性、响应时间、SSL 证书 | 历史快照、告警压缩 |
| **API 监控** | 最快 2 分钟 | 全类型 API(GET/POST/PUT/DELETE/HEAD/OPTIONS)、Postman 导入 | 脚本录入、历史快照 |
| **页面性能监控** | 最快 5 分钟 | 元素瀑布图、CDN 分析、性能评估 | 元素瀑布图留存、CDN 节点分析 |

### 1.2 通用功能需求

1. **监控大屏** - 实时展示关键指标
2. **数据报表** - 日/周/月报 + 项目对比 + 同期对比
3. **告警系统** - 阈值配置、告警压缩、多渠道推送
4. **用户权限** - 多用户、多角色、配额管理、数据隔离
5. **探针管理** - 分布式探针调度

---

## 二、功能模块详细规划

### P0 - 核心功能（必须实现）

#### 2.1 首页 Dashboard (Dashboard.vue)
- [ ] 统计卡片：总算数、运行中、已暂停、异常
- [ ] 监控类型分布图
- [ ] 最近告警列表
- [ ] 响应时间趋势图（Chart.js/ECharts）
- [ ] 探针状态概览
- [ ] 快速创建入口

**文件**: `web/src/views/Dashboard.vue`
**状态**: ✅ 基础实现完成，待增强图表

#### 2.2 网站监控模块

##### 2.2.1 网站列表页 (Websites/List.vue)
- [ ] 监控任务表格（分页、排序、筛选）
- [ ] 状态指示器（运行中/暂停/错误/DOWN）
- [ ] 快速操作（暂停/启用、编辑、删除、详情）
- [ ] 批量操作
- [ ] 搜索功能

**文件**: `web/src/views/Websites/List.vue`
**状态**: ⚠️ 需要创建

##### 2.2.2 网站详情页 (Websites/Detail.vue)
- [ ] 基本信息展示
- [ ] 响应时间曲线图
- [ ] 可用性统计（日/周/月）
- [ ] 历史检查记录
- [ ] SSL 证书信息
- [ ] 告警历史记录
- [ ] 快速检测按钮

**文件**: `web/src/views/Websites/Detail.vue`
**状态**: ⚠️ 需要创建

##### 2.2.3 网站创建页 (Websites/Create.vue)
- [ ] 复用 Monitors/Create.vue
- [ ] 网站监控专用配置
- [ ] SSL 验证选项
- [ ] 内容检查配置

**文件**: `web/src/views/Websites/Create.vue`
**状态**: ⚠️ 需要创建（可复用现有 Create.vue）

#### 2.3 API 监控模块

##### 2.3.1 API 列表页 (APIs/List.vue)
- [ ] API 监控任务表格
- [ ] 按方法分组筛选（GET/POST/PUT/DELETE）
- [ ] 状态指示
- [ ] 快速操作

**文件**: `web/src/views/APIs/List.vue`
**状态**: ⚠️ 需要创建

##### 2.3.2 API 详情页 (APIs/Detail.vue)
- [ ] API 基本信息
- [ ] 请求/响应历史
- [ ] 断言验证结果
- [ ] 响应时间趋势
- [ ] 错误统计

**文件**: `web/src/views/APIs/Detail.vue`
**状态**: ⚠️ 需要创建

##### 2.3.3 Postman 导入页 (APIs/Import.vue)
- [ ] 文件上传（Drag & Drop）
- [ ] Postman Collection 解析
- [ ] 接口选择（多选）
- [ ] 批量配置（认证、频率、告警）
- [ ] 导入预览
- [ ] 执行导入

**文件**: `web/src/views/APIs/Import.vue`
**状态**: ✅ 已实现

#### 2.4 页面性能监控模块

##### 2.4.1 页面列表页 (Pages/List.vue)
- [ ] 页面监控任务表格
- [ ] Core Web Vitals 指标展示（FCP/LCP/CLS）
- [ ] 状态指示
- [ ] 快速操作

**文件**: `web/src/views/Pages/List.vue`
**状态**: ⚠️ 需要创建

##### 2.4.2 页面详情页 (Pages/Detail.vue)
- [ ] 基本信息
- [ ] Core Web Vitals 趋势图
- [ ] 性能评分
- [ ] 元素瀑布图（Waterfall Chart）
- [ ] CDN 分析
- [ ] 资源加载分析
- [ ] 历史快照对比

**文件**: `web/src/views/Pages/Detail.vue`
**状态**: ⚠️ 需要创建

##### 2.4.3 页面性能监控核心逻辑
- [ ] Puppeteer 集成（server 端）
- [ ] 页面性能数据采集
- [ ] 瀑布图数据生成
- [ ] CDN 节点识别
- [ ] 性能评分算法

**文件**: `server/src/services/page-perf.service.ts`
**状态**: ⚠️ 需要创建

##### 2.4.4 瀑布图组件 (Pages/components/WaterfallChart.vue)
- [ ] 资源加载时间线
- [ ] 资源类型颜色区分
- [ ] 详细悬停信息
- [ ] 缩放功能

**文件**: `web/src/views/Pages/components/WaterfallChart.vue`
**状态**: ⚠️ 需要创建

##### 2.4.5 CDN 分析组件 (Pages/components/CDNAnalysis.vue)
- [ ] CDN 节点分布地图
- [ ] 节点响应时间对比
- [ ] Cache 命中率
- [ ] 供应商分析

**文件**: `web/src/views/Pages/components/CDNAnalysis.vue`
**状态**: ⚠️ 需要创建

#### 2.5 探针管理模块 (Probes.vue)

- [ ] 探针列表（状态、区域、版本）
- [ ] 探针详情
- [ ] 探针分组管理
- [ ] 探针任务分配
- [ ] 探针健康检查
- [ ] 探针版本升级

**文件**: `web/src/views/Probes.vue`
**状态**: ⚠️ 部分实现，需要增强

#### 2.6 告警管理模块 (Alerts.vue)

##### 2.6.1 告警列表页
- [ ] 告警事件表格
- [ ] 按严重程度筛选（INFO/WARNING/CRITICAL/FATAL）
- [ ] 按状态筛选（未确认/已确认/已解决）
- [ ] 告警确认操作
- [ ] 告警批量处理

**文件**: `web/src/views/Alerts.vue`
**状态**: ⚠️ 需要增强

##### 2.6.2 告警规则配置 (AlertRulesForm.vue)
- [ ] DOWN 条件（连续失败次数）
- [ ] RESPONSE_TIME 条件（响应时间阈值）
- [ ] SSL_EXPIRY 条件（证书过期天数）
- [ ] CHANGE 条件（内容变化检测）
- [ ] 通知渠道配置
- [ ] 告警压缩配置
- [ ] 冷却时间配置

**文件**: `web/src/views/Monitors/components/AlertRulesForm.vue`
**状态**: ✅ 已实现

##### 2.6.3 告警服务后端
- [ ] 告警评估引擎
- [ ] 告警压缩（防 flooding）
- [ ] 多渠道通知
- [ ] 告警去重（fingerprint）
- [ ] 告警升级机制

**文件**: `server/src/services/alert.service.ts`
**状态**: ✅ 已实现

#### 2.7 数据报表模块 (Reports)

##### 2.7.1 报表列表页 (Reports/List.vue)
- [ ] 历史报表列表
- [ ] 按类型筛选（日/周/月）
- [ ] 报表导出（PDF/CSV）
- [ ] 邮件订阅管理

**文件**: `web/src/views/Reports/List.vue`
**状态**: ⚠️ 需要创建

##### 2.7.2 日报表 (Reports/Daily.vue)
- [ ] 当日总览
- [ ] 监控任务统计
- [ ] 告警统计
- [ ] 可用性排名
- [ ] 响应时间排名

**文件**: `web/src/views/Reports/Daily.vue`
**状态**: ⚠️ 需要创建

##### 2.7.3 周报表 (Reports/Weekly.vue)
- [ ] 本周总览
- [ ] 趋势分析
- [ ] 同比/环比

**文件**: `web/src/views/Reports/Weekly.vue`
**状态**: ⚠️ 需要创建

##### 2.7.4 月报表 (Reports/Monthly.vue)
- [ ] 本月总览
- [ ] 月度趋势
- [ ] SLA 达成情况

**文件**: `web/src/views/Reports/Monthly.vue`
**状态**: ⚠️ 需要创建

##### 2.7.5 项目对比页 (Reports/Compare.vue)
- [ ] 多项目选择
- [ ] 同视图对比展示
- [ ] 多指标横向对比
- [ ] 对比报告生成

**文件**: `web/src/views/Reports/Compare.vue`
**状态**: ⚠️ 需要创建

##### 2.7.6 同期对比页 (Reports/Trend.vue)
- [ ] 时间范围选择
- [ ] 同一项目不同时期对比
- [ ] 多指标趋势分析
- [ ] 变化幅度标注

**文件**: `web/src/views/Reports/Trend.vue`
**状态**: ⚠️ 需要创建

##### 2.7.7 报表服务后端
- [ ] 报表数据生成
- [ ] 报表存储
- [ ] 定时报表任务
- [ ] 邮件发送

**文件**: `server/src/services/report.service.ts`
**状态**: ✅ 已实现

#### 2.8 监控大屏 (Screen)

##### 2.8.1 大屏首页 (Screen/index.vue)
- [ ] 全屏显示
- [ ] 自动刷新
- [ ] 多屏幕切换
- [ ] 自定义布局

**文件**: `web/src/views/Screen/index.vue`
**状态**: ⚠️ 需要创建

##### 2.8.2 大屏详情页 (Screen/Detail.vue)
- [ ] 统计卡片组件
- [ ] 实时监控图表
- [ ] 告警滚动条
- [ ] 探针地图
- [ ] 性能热力图

**文件**: `web/src/views/Screen/Detail.vue`
**状态**: ⚠️ 需要创建

### P1 - 重要功能（应该实现）

#### 2.9 用户权限管理模块

##### 2.9.1 用户列表页 (Users/List.vue)
- [ ] 用户表格
- [ ] 角色筛选
- [ ] 部门筛选
- [ ] 启用/禁用
- [ ] 配额管理

**文件**: `web/src/views/Users/List.vue`
**状态**: ⚠️ 需要创建

##### 2.9.2 用户创建/编辑页 (Users/Create.vue, Users/Detail.vue)
- [ ] 基本信息
- [ ] 角色选择
- [ ] 部门分配
- [ ] 配额设置
- [ ] 密码管理

**文件**: `web/src/views/Users/Create.vue`
**状态**: ⚠️ 需要创建

##### 2.9.3 角色管理页 (Users/Roles.vue)
- [ ] 角色列表
- [ ] 权限配置
- [ ] 角色复制

**文件**: `web/src/views/Users/Roles.vue`
**状态**: ⚠️ 需要创建

##### 2.9.4 部门管理页 (Users/Departments.vue)
- [ ] 部门树形结构
- [ ] 部门增删改
- [ ] 部门成员管理

**文件**: `web/src/views/Users/Departments.vue`
**状态**: ⚠️ 需要创建

#### 2.10 设置模块 (Settings.vue)
- [ ] 个人资料
- [ ] 通知偏好
- [ ] API Token 管理
- [ ] 第三方集成
- [ ] 审计日志查看

**文件**: `web/src/views/Settings.vue`
**状态**: ⚠️ 需要创建

---

## 三、后端服务实现清单

### 3.1 已有服务

| 服务 | 文件 | 状态 |
|------|------|------|
| 认证服务 | `server/src/services/auth.service.ts` | ✅ |
| 告警服务 | `server/src/services/alert.service.ts` | ✅ |
| 报表服务 | `server/src/services/report.service.ts` | ✅ |
| 调度服务 | `server/src/services/scheduler.service.ts` | ✅ |
| Socket 服务 | `server/src/services/socket.service.ts` | ✅ |
| 邮件服务 | `server/src/services/email.service.ts` | ✅ |
| 通知服务 | `server/src/services/notification.service.ts` | ✅ |

### 3.2 需要创建的服务

| 服务 | 文件 | 优先级 |
|------|------|--------|
| 页面性能服务 | `server/src/services/page-perf.service.ts` | P0 |
| 快照服务 | `server/src/services/snapshot.service.ts` | P0 |
| 报表导出服务 | `server/src/services/export.service.ts` | P1 |
| CDN 分析服务 | `server/src/services/cdn-analysis.service.ts` | P1 |

---

## 四、测试计划

### 4.1 单元测试 (Unit Tests)

#### 4.1.1 前端组件测试
```
web/src/views/Monitors/
  - Create.spec.ts
  - Edit.spec.ts
  - components/
    - MonitorTypeSelector.spec.ts
    - HttpConfig.spec.ts
    - ApiConfig.spec.ts
    - AlertRulesForm.spec.ts

web/src/views/APIs/
  - Import.spec.ts
  - List.spec.ts
  - Detail.spec.ts

web/src/views/Pages/
  - List.spec.ts
  - Detail.spec.ts
  - components/
    - WaterfallChart.spec.ts
    - CDNAnalysis.spec.ts

web/src/views/Reports/
  - List.spec.ts
  - Daily.spec.ts
  - Weekly.spec.ts
  - Monthly.spec.ts
  - Compare.spec.ts
  - Trend.spec.ts
```

#### 4.1.2 后端服务测试
```
server/src/services/
  - alert.service.spec.ts
  - report.service.spec.ts
  - scheduler.service.spec.ts
  - page-perf.service.spec.ts
  - snapshot.service.spec.ts

server/src/controllers/
  - monitor.controller.spec.ts
  - alert.controller.spec.ts
  - report.controller.spec.ts
```

#### 4.1.3 共享库测试
```
packages/shared/src/
  - types.spec.ts
  - validators.spec.ts
```

### 4.2 集成测试 (Integration Tests)

```
server/tests/integration/
  - auth.integration.test.ts    - 认证流程
  - monitor.integration.test.ts - 监控 CRUD
  - alert.integration.test.ts   - 告警流程
  - report.integration.test.ts  - 报表生成
```

### 4.3 E2E 测试 (End-to-End)

```
web/e2e/
  - auth.spec.ts        - 登录/注册
  - monitors.spec.ts    - 监控管理流程
  - alerts.spec.ts      - 告警管理流程
  - reports.spec.ts     - 报表查看流程
  - api-import.spec.ts  - Postman 导入流程
```

### 4.4 UAT 测试检查清单

#### 网站监控 UAT
- [ ] 创建 HTTP 监控任务
- [ ] 创建 HTTPS 监控任务
- [ ] 配置 SSL 验证
- [ ] 配置内容检查
- [ ] 查看监控详情
- [ ] 查看历史快照
- [ ] 触发告警并接收通知

#### API 监控 UAT
- [ ] 创建 GET API 监控
- [ ] 创建 POST API 监控
- [ ] 配置认证（Basic/Bearer/APIKey）
- [ ] 配置断言
- [ ] 导入 Postman Collection
- [ ] 批量创建监控
- [ ] 查看 API 响应历史

#### 页面性能监控 UAT
- [ ] 创建页面性能监控
- [ ] 查看 Core Web Vitals 指标
- [ ] 查看元素瀑布图
- [ ] 查看 CDN 分析
- [ ] 对比历史性能
- [ ] 导出性能报告

#### 告警系统 UAT
- [ ] 配置 DOWN 告警
- [ ] 配置响应时间告警
- [ ] 配置 SSL 过期告警
- [ ] 测试告警压缩
- [ ] 接收邮件告警
- [ ] 配置 Webhook 回调

#### 报表系统 UAT
- [ ] 查看日报
- [ ] 查看周报
- [ ] 查看月报
- [ ] 项目对比
- [ ] 同期对比
- [ ] 导出报表

#### 用户权限 UAT
- [ ] 创建用户
- [ ] 分配角色
- [ ] 配置权限
- [ ] 配额限制测试
- [ ] 数据隔离测试

---

## 五、实现顺序

### 阶段 1: 核心功能完善 (P0)
1. 完善 Dashboard 图表
2. 创建网站监控页面（List/Detail）
3. 创建 API 监控页面（List/Detail）
4. 实现页面性能监控服务（Puppeteer）
5. 创建页面性能监控页面
6. 实现瀑布图和 CDN 分析组件

### 阶段 2: 报表和告警 (P0)
1. 完善报表页面（Daily/Weekly/Monthly）
2. 实现项目对比和同期对比
3. 完善告警管理页面
4. 实现监控大屏

### 阶段 3: 用户权限 (P1)
1. 用户管理页面
2. 角色权限配置
3. 部门管理
4. 设置页面

### 阶段 4: 测试 (All)
1. 编写单元测试
2. 编写集成测试
3. 执行 E2E 测试
4. UAT 验证

---

## 六、技术栈

### 前端
- Vue 3 + TypeScript + Composition API
- Pinia (状态管理)
- Vue Router (路由)
- Ant Design Vue (UI 组件)
- Chart.js / ECharts (图表)
- Vitest + Vue Testing Framework (测试)
- Playwright (E2E 测试)

### 后端
- Node.js + Express + TypeScript
- Prisma ORM (数据库)
- SQLite (开发) / PostgreSQL (生产)
- Socket.IO (WebSocket)
- node-cron (定时任务)
- Puppeteer (页面性能)
- Vitest (单元测试)
- Supertest (集成测试)

---

## 七、项目结构

```
D:\Working\CCWS/
├── packages/shared/          # 共享类型定义
├── server/
│   ├── src/
│   │   ├── controllers/      # 控制器
│   │   ├── services/         # 服务层
│   │   ├── middlewares/      # 中间件
│   │   ├── api/              # 路由定义
│   │   ├── database/         # 数据库
│   │   ├── utils/            # 工具函数
│   │   └── index.ts          # 入口
│   ├── prisma/               # Prisma schema
│   ├── tests/
│   │   ├── unit/             # 单元测试
│   │   └── integration/      # 集成测试
│   └── package.json
├── web/
│   ├── src/
│   │   ├── views/            # 页面组件
│   │   ├── components/       # 通用组件
│   │   ├── layouts/          # 布局组件
│   │   ├── stores/           # Pinia stores
│   │   ├── router/           # 路由配置
│   │   ├── services/         # API 服务
│   │   └── App.vue
│   ├── e2e/                  # E2E 测试
│   └── package.json
└── agent/                    # 探针 agent
```

---

## 八、里程碑

| 里程碑 | 目标 | 预计完成 |
|--------|------|----------|
| M1 | 核心监控功能完整 | Week 1-2 |
| M2 | 页面性能监控完成 | Week 3 |
| M3 | 报表系统完成 | Week 4 |
| M4 | 用户权限完成 | Week 5 |
| M5 | 测试完成 | Week 6 |
| M6 | UAT 验收 | Week 7 |

---

## 九、当前状态评估

### 已完成
- ✅ 基础架构（Monorepo、TypeScript、Prisma）
- ✅ 认证系统（JWT、RBAC）
- ✅ 监控 CRUD API
- ✅ 告警服务（含压缩）
- ✅ 报表服务
- ✅ 调度服务
- ✅ 前端监控创建/编辑页面
- ✅ Postman 导入
- ✅ Dashboard 基础

### 待完成
- ⚠️ 网站监控专用页面
- ⚠️ API 监控专用页面
- ⚠️ 页面性能监控（Puppeteer 集成）
- ⚠️ 瀑布图和 CDN 分析组件
- ⚠️ 报表页面系列
- ⚠️ 项目对比和同期对比
- ⚠️ 监控大屏
- ⚠️ 用户权限管理
- ⚠️ 所有测试用例
