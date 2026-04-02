// Shared types for DEM 业务体验监控系统 (Commercial Version)

// ============================================================================
// Monitor Types & Status
// ============================================================================

/**
 * Monitoring task types - 支持商业版所有监控类型
 */
export type MonitorType =
  | 'HTTP'
  | 'HTTPS'
  | 'PING'
  | 'DNS'
  | 'TRACEROUTE'
  | 'FTP'
  | 'TCP'
  | 'UDP'
  | 'API'
  | 'PAGE_PERF';      // 页面性能监控

/**
 * Monitor task status
 */
export type MonitorStatus =
  | 'ACTIVE'      // 正常运行
  | 'PAUSED'      // 已暂停
  | 'ERROR'       // 错误状态
  | 'DOWN';       // 目标服务不可用

/**
 * Probe agent status
 */
export type ProbeStatus =
  | 'ONLINE'
  | 'OFFLINE'
  | 'BUSY'
  | 'MAINTENANCE';

// ============================================================================
// User, Role & Permission Types (RBAC)
// ============================================================================

/**
 * User roles for RBAC
 */
export type UserRole =
  | 'SUPER_ADMIN'   // 超级管理员
  | 'ADMIN'         // 管理员
  | 'MANAGER'       // 部门经理
  | 'USER'          // 普通用户
  | 'VIEWER';       // 只读用户

/**
 * Department/Team structure
 */
export interface Department {
  id: string;
  name: string;
  parentId?: string;
  path: string;           // 部门路径，如 /总部/技术部/前端组
  createdAt: Date;
}

/**
 * User account with commercial features
 */
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  departmentId?: string;
  quota: number;          // 监控任务配额
  enabled: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Permission definition
 */
export interface Permission {
  id: string;
  name: string;
  resource: string;       // monitor, alert, user, report, etc.
  actions: string[];      // create, read, update, delete
}

/**
 * Role with permissions
 */
export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: Permission[];
}

// ============================================================================
// Probe Types
// ============================================================================

export interface Probe {
  id: string;
  name: string;
  status: ProbeStatus;
  location?: string;
  ip?: string;
  lastHeartbeat?: Date;
  capabilities: MonitorType[];
  currentTasks: string[];
  version?: string;
  tags?: string[];        // 探针标签，用于路由
  region?: string;        // 所属区域
  customerId?: string;    // 私有探针关联客户
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Monitor Task Types
// ============================================================================

/**
 * Base monitor task configuration
 */
export interface MonitorTask {
  id: string;
  name: string;
  type: MonitorType;
  target: string;
  interval: number;       // Check interval in seconds (60=1 分钟最小)
  timeout: number;        // Timeout in milliseconds
  status: MonitorStatus;
  userId: string;         // 所属用户
  probeIds: string[];
  tags?: string[];
  notes?: string;
  slaTarget?: number;     // SLA 目标 % (e.g., 99.9)
  followRedirects?: boolean;
  retryCount?: number;
  config: MonitorConfig;
  alertRules?: AlertRule[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Unified monitor config type
 */
export type MonitorConfig =
  | HTTPMonitorConfig
  | APIMonitorConfig
  | PingMonitorConfig
  | DNSMonitorConfig
  | TraceRouteMonitorConfig
  | TCPMonitorConfig
  | UDPMonitorConfig
  | FTPMonitorConfig
  | PagePerfMonitorConfig;

/**
 * HTTP/HTTPS monitor config
 */
export interface HTTPMonitorConfig {
  method: 'GET' | 'POST' | 'HEAD';
  headers?: Record<string, string>;
  expectedStatusCode?: number;
  expectedBodyContains?: string;
  expectedBodyNotContains?: string;
  followRedirects: boolean;
  validateSSL: boolean;
}

/**
 * API monitor config - 支持全类型 API
 */
export interface APIMonitorConfig {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
  headers?: Record<string, string>;
  body?: string;
  bodyType?: 'json' | 'form' | 'xml' | 'text';
  expectedStatusCode?: number;
  expectedBodyContains?: string;
  auth?: {
    type: 'none' | 'basic' | 'bearer' | 'apikey';
    username?: string;
    password?: string;
    token?: string;
    apiKey?: string;
    apiValue?: string;
  };
  assertions?: APIAssertion[];
  followRedirects: boolean;
  validateSSL: boolean;
}

/**
 * API assertion for validation
 */
export interface APIAssertion {
  type: 'status' | 'body' | 'header' | 'time' | 'json';
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'contains' | 'regex';
  value: string | number;
}

/**
 * Ping monitor config
 */
export interface PingMonitorConfig {
  count: number;
  packetSize?: number;
}

/**
 * DNS monitor config
 */
export interface DNSMonitorConfig {
  recordType: 'A' | 'AAAA' | 'CNAME' | 'MX' | 'NS' | 'TXT' | 'SOA';
  expectedIP?: string;
  nameserver?: string;
}

/**
 * TraceRoute monitor config
 */
export interface TraceRouteMonitorConfig {
  maxHops: number;
  protocol: 'ICMP' | 'UDP' | 'TCP';
}

/**
 * TCP monitor config
 */
export interface TCPMonitorConfig {
  port: number;
  expectedResponse?: string;
}

/**
 * UDP monitor config
 */
export interface UDPMonitorConfig {
  port: number;
  message?: string;
  expectedResponse?: string;
}

/**
 * FTP monitor config
 */
export interface FTPMonitorConfig {
  port: number;
  username?: string;
  password?: string;
  expectedResponse?: string;
}

/**
 * Page Performance monitor config - 页面性能监控
 */
export interface PagePerfMonitorConfig {
  url: string;
  viewport: {
    width: number;
    height: number;
  };
  device: 'desktop' | 'mobile';
  blockResources?: string[];  // ['image', 'css', 'font']
  extraHeaders?: Record<string, string>;
  waitUntil: 'load' | 'domcontentloaded' | 'networkidle';
  timeout: number;
  captureScreenshot: boolean;
  captureHar: boolean;
}

// ============================================================================
// Check Result Types
// ============================================================================

/**
 * Monitor check result
 */
export interface CheckResult {
  id: string;
  taskId: string;
  monitorId: string;
  probeId: string;
  timestamp: Date;
  success: boolean;
  responseTime?: number;
  statusCode?: number;
  errorMessage?: string;
  details?: CheckDetails;

  // Performance timing (HTTP/API/PagePerf)
  dnsTime?: number;         // DNS 解析时间 ms
  tcpTime?: number;         // TCP 连接时间 ms
  tlsTime?: number;         // TLS 握手时间 ms
  ttfbTime?: number;        // 首字节时间 ms
  downloadTime?: number;    // 下载时间 ms
  totalTime?: number;       // 总时间 ms

  // Page Performance specific
  domContentLoaded?: number;
  domComplete?: number;
  firstContentfulPaint?: number;  // FCP
  largestContentfulPaint?: number; // LCP
  cumulativeLayoutShift?: number;  // CLS
  firstInputDelay?: number;        // FID

  // Resources waterfall data
  resources?: ResourceTiming[];

  // SSL info
  sslExpiryDate?: Date;
  sslIssuer?: string;

  // Snapshot references
  screenshotUrl?: string;
  harUrl?: string;
}

/**
 * Resource timing for waterfall chart
 */
export interface ResourceTiming {
  name: string;
  type: string;           // 'script', 'css', 'image', 'font', 'xhr', 'fetch', etc.
  startTime: number;      // ms
  duration: number;       // ms
  transferSize?: number;  // bytes
  encodedBodySize?: number;
  decodedBodySize?: number;
  initiatorType?: string;
  responseStatus?: number;
  serverIPAddress?: string;
  protocol?: string;
  cache?: 'hit' | 'miss' | 'expired';
  cdnProvider?: string;
}

/**
 * Type-specific check details
 */
export interface CheckDetails {
  // HTTP/API
  url?: string;
  method?: string;
  headers?: Record<string, string>;
  bodySize?: number;

  // Ping
  packetsSent?: number;
  packetsReceived?: number;
  packetLoss?: number;
  minRtt?: number;
  avgRtt?: number;
  maxRtt?: number;

  // DNS
  resolvedIPs?: string[];
  nameserver?: string;
  recordType?: string;

  // TraceRoute
  hops?: HopInfo[];

  // TCP/UDP/FTP
  port?: number;
  connected?: boolean;
  banner?: string;

  // Page Perf
  screenshot?: string;    // Base64
  har?: unknown;          // HAR JSON
}

/**
 * Single hop information from TraceRoute
 */
export interface HopInfo {
  ttl: number;
  ip?: string;
  hostname?: string;
  rtt1?: number;
  rtt2?: number;
  rtt3?: number;
}

// ============================================================================
// Alert Types
// ============================================================================

/**
 * Alert severity levels
 */
export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL' | 'FATAL';

/**
 * Alert notification channels
 */
export type AlertChannel =
  | 'EMAIL'
  | 'SMS'
  | 'VOICE'
  | 'APP_PUSH'
  | 'WEBHOOK'
  | 'URL'
  | 'DINGTALK'
  | 'WECHAT'
  | 'SLACK';

/**
 * Alert condition types
 */
export type AlertCondition =
  | { type: 'DOWN'; threshold: number }
  | { type: 'RESPONSE_TIME'; operator: '>' | '<'; threshold: number }
  | { type: 'SSL_EXPIRY'; daysBefore: number }
  | { type: 'CHANGE'; field: string }
  | { type: 'THRESHOLD'; metric: string; operator: '>' | '<'; threshold: number };

/**
 * Alert rule configuration
 */
export interface AlertRule {
  id: string;
  monitorId: string;
  name: string;
  condition: AlertCondition;
  channels: AlertChannel[];
  recipients: string[];
  enabled: boolean;
  cooldown?: number;            // 告警冷却时间（秒）
  severity?: AlertSeverity;
  compressionEnabled?: boolean; // 是否启用告警压缩
  compressionWindow?: number;   // 压缩时间窗口（秒）
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Alert event
 */
export interface AlertEvent {
  id: string;
  ruleId: string;
  monitorId: string;
  taskId: string;
  taskName: string;
  type: AlertType;
  message: string;
  severity: AlertSeverity;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolved: boolean;
  resolvedAt?: Date;
  fingerprint: string;      // 用于告警去重
  incidentId?: string;
  context?: Record<string, unknown>;
  timestamp: Date;
  createdAt: Date;
}

/**
 * Alert types
 */
export type AlertType =
  | 'DOWN'
  | 'RESPONSE_TIME'
  | 'SSL_EXPIRY'
  | 'CHANGE'
  | 'THRESHOLD'
  | 'RECOVERY';

/**
 * Incident for alert aggregation
 */
export interface Incident {
  id: string;
  monitorId: string;
  title: string;
  status: IncidentStatus;
  severity: AlertSeverity;
  startedAt: Date;
  endedAt?: Date;
  summary?: string;
  alerts: AlertEvent[];
}

export type IncidentStatus =
  | 'OPEN'
  | 'INVESTIGATING'
  | 'IDENTIFIED'
  | 'MONITORING'
  | 'RESOLVED';

// ============================================================================
// Notification & Integration Types
// ============================================================================

/**
 * Notification status
 */
export type NotificationStatus = 'PENDING' | 'SENT' | 'FAILED' | 'RETRYING';

/**
 * Notification record
 */
export interface Notification {
  id: string;
  alertId?: string;
  channel: string;
  recipient: string;
  subject?: string;
  content: string;
  status: NotificationStatus;
  sentAt?: Date;
  error?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

/**
 * Integration type
 */
export type IntegrationType =
  | 'WEBHOOK'
  | 'DINGTALK'
  | 'WECHAT'
  | 'SLACK'
  | 'TEAMS'
  | 'PAGERDUTY'
  | 'OPSGENIE';

/**
 * Third-party integration config
 */
export interface Integration {
  id: string;
  userId: string;
  type: IntegrationType;
  name: string;
  config: Record<string, unknown>;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// API Token & Audit Types
// ============================================================================

/**
 * API Token for external access
 */
export interface ApiToken {
  id: string;
  userId: string;
  name: string;
  token: string;          // Hashed
  prefix: string;         // Display prefix, e.g., "sk_live_..."
  scopes: string[];       // Permission scopes
  expiresAt?: Date;
  lastUsedAt?: Date;
  createdAt: Date;
}

/**
 * Audit log entry
 */
export interface AuditLog {
  id: string;
  userId?: string;
  action: string;         // CREATE, UPDATE, DELETE, LOGIN, etc.
  resource: string;       // monitor, user, alert, etc.
  resourceId?: string;
  details?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  createdAt: Date;
}

// ============================================================================
// Quota & Statistics Types
// ============================================================================

/**
 * Quota usage tracking
 */
export interface QuotaUsage {
  id: string;
  userId: string;
  period: 'daily' | 'monthly';
  periodStart: Date;
  periodEnd: Date;
  monitorCount: number;
  checkCount: number;
  alertCount: number;
  createdAt: Date;
}

/**
 * Monitor snapshot for historical data
 */
export interface MonitorSnapshot {
  id: string;
  monitorId: string;
  period: 'daily' | 'weekly' | 'monthly';
  periodStart: Date;
  periodEnd: Date;

  // Statistics
  totalChecks: number;
  successCount: number;
  failureCount: number;
  avgResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  uptimePercent: number;

  // Detailed data
  hourlyStats?: Record<string, unknown>;
  probeStats?: Record<string, unknown>;

  createdAt: Date;
}

/**
 * Dashboard statistics
 */
export interface DashboardStats {
  totalMonitors: number;
  activeMonitors: number;
  pausedMonitors: number;
  downMonitors: number;
  totalProbes: number;
  onlineProbes: number;
  offlineProbes: number;
  totalAlerts: number;
  unacknowledgedAlerts: number;
  avgUptime: number;
  recentAlerts: AlertEvent[];
}

// ============================================================================
// Report Types
// ============================================================================

/**
 * Report type
 */
export type ReportType = 'daily' | 'weekly' | 'monthly' | 'custom';

/**
 * Report data
 */
export interface Report {
  id: string;
  type: ReportType;
  periodStart: Date;
  periodEnd: Date;
  monitors: string[];     // Monitor IDs included
  data: ReportData;
  createdAt: Date;
}

/**
 * Report data structure
 */
export interface ReportData {
  summary: {
    totalChecks: number;
    successRate: number;
    avgResponseTime: number;
    uptimePercent: number;
  };
  byMonitor: MonitorReportData[];
  byProbe: ProbeReportData[];
  byHour?: HourlyStats[];
  incidents: IncidentSummary[];
  alerts: AlertSummary[];
}

/**
 * Monitor-specific report data
 */
export interface MonitorReportData {
  monitorId: string;
  monitorName: string;
  totalChecks: number;
  successRate: number;
  avgResponseTime: number;
  uptimePercent: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  slowestChecks: CheckResult[];
}

/**
 * Probe-specific report data
 */
export interface ProbeReportData {
  probeId: string;
  probeName: string;
  totalChecks: number;
  successRate: number;
  avgResponseTime: number;
}

/**
 * Hourly statistics
 */
export interface HourlyStats {
  hour: string;
  totalChecks: number;
  successRate: number;
  avgResponseTime: number;
}

/**
 * Incident summary
 */
export interface IncidentSummary {
  id: string;
  title: string;
  severity: AlertSeverity;
  duration: number;       // minutes
  affectedMonitors: string[];
}

/**
 * Alert summary
 */
export interface AlertSummary {
  total: number;
  bySeverity: Record<AlertSeverity, number>;
  byType: Record<AlertType, number>;
  topAlerts: AlertEvent[];
}

// ============================================================================
// Dashboard Screen Types
// ============================================================================

/**
 * Dashboard screen configuration
 */
export interface DashboardScreen {
  id: string;
  userId: string;
  name: string;
  layout: ScreenLayout;
  widgets: ScreenWidget[];
  refreshInterval: number;  // seconds
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Screen layout configuration
 */
export interface ScreenLayout {
  type: 'grid' | 'free';
  columns: number;
  rows: number;
}

/**
 * Screen widget
 */
export interface ScreenWidget {
  id: string;
  type: WidgetType;
  x: number;
  y: number;
  width: number;
  height: number;
  config: Record<string, unknown>;
}

export type WidgetType =
  | 'stat_card'
  | 'uptime_chart'
  | 'response_chart'
  | 'alert_list'
  | 'probe_map'
  | 'monitor_list'
  | 'gauge';

// ============================================================================
// API Request/Response Types
// ============================================================================

/**
 * API response wrapper
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Pagination params
 */
export interface PaginationParams {
  page: number;
  pageSize: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ============================================================================
// Postman Import Types
// ============================================================================

/**
 * Postman collection import
 */
export interface PostmanCollection {
  info: {
    name: string;
    schema: string;
  };
  item: PostmanItem[];
  variable?: PostmanVariable[];
}

export interface PostmanItem {
  name: string;
  request: {
    method: string;
    url: {
      raw: string;
      protocol: string;
      host: string[];
      path?: string[];
    };
    header?: { key: string; value: string }[];
    body?: {
      mode: 'raw' | 'formdata' | 'urlencoded';
      raw?: string;
    };
    auth?: {
      type: string;
      [key: string]: unknown;
    };
  };
}

export interface PostmanVariable {
  key: string;
  value: string;
  type: string;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Task execution status
 */
export type TaskStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED'
  | 'TIMEOUT';

/**
 * Monitor task instance
 */
export interface MonitorTaskInstance {
  id: string;
  monitorId: string;
  probeId: string;
  status: TaskStatus;
  scheduledAt: Date;
  executedAt?: Date;
  result?: CheckResult;
  error?: string;
  retryCount: number;
}
