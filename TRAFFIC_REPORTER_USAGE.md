# 流量上报功能使用文档

## 概述

流量上报功能会自动监控应用的网络流量使用情况，当累计流量达到设定阈值（默认500MB）时，自动向服务器上报流量数据。系统会返回用户的配额使用情况，并在配额即将用完或已超限时发出提醒。

**重要**: 此功能完全独立运行，不会影响现有的UI逻辑和流量显示组件。

## 功能特性

- 🚀 **自动上报**: 每消耗500MB流量自动上报
- 📊 **独立监控**: 使用独立的WebSocket连接监控流量，不干扰现有UI
- 💾 **状态持久化**: 流量数据本地存储，应用重启后恢复
- 🔐 **认证集成**: 与用户认证系统完全集成
- ⚠️ **配额监控**: 自动检查配额状态并发出警告
- 🛡️ **错误处理**: 完善的错误处理和重试机制
- 🔇 **静默运行**: 后台运行，错误静默处理，不影响用户体验

## 架构设计

### 独立流量监控

```
App Layout
├── useTrafficMonitor (独立hook)
│   ├── 独立WebSocket连接
│   ├── 独立流量累计
│   └── 自动流量上报
└── 现有UI组件 (不受影响)
    ├── LayoutTraffic
    ├── EnhancedTrafficStats
    └── TrafficGraph
```

### 工作流程

1. **初始化**: 在主布局(`_layout.tsx`)中初始化流量监控
2. **独立连接**: 创建专门的WebSocket连接用于流量统计
3. **累计计算**: 实时累计上传/下载流量
4. **自动上报**: 达到500MB阈值时自动上报
5. **配额监控**: 处理服务器返回的配额状态
6. **静默运行**: 所有错误静默处理，不干扰UI

## 技术实现

### 1. 自动初始化

流量监控在应用主布局中自动初始化：

```typescript
// src/pages/_layout.tsx
import { useTrafficMonitor } from "@/hooks/use-traffic-monitor";

const Layout = () => {
  // 自动启动流量监控（后台运行）
  const { resetTrafficStats } = useTrafficMonitor();
  
  // 在用户退出时重置统计
  const handleLogout = () => {
    resetTrafficStats();
    signOut();
  };
};
```

### 2. 独立Hook

```typescript
// src/hooks/use-traffic-monitor.ts
export const useTrafficMonitor = () => {
  // 独立的WebSocket连接
  // 独立的流量累计统计
  // 自动调用流量上报服务
  
  return {
    getTrafficStats,    // 获取统计信息
    resetTrafficStats,  // 重置统计
    isInitialized,      // 是否已初始化
  };
};
```

### 3. 流量上报服务

```typescript
// src/services/traffic-reporter.ts
import trafficReporter from '@/services/traffic-reporter';

// 自动上报（在hook中调用）
await trafficReporter.updateTraffic(uploadBytes, downloadBytes);

// 手动上报
const result = await trafficReporter.manualReport(uploadMB, downloadMB);

// 强制上报
const result = await trafficReporter.forceReport();
```

### 4. 配置管理

```typescript
// 设置上报阈值
trafficReporter.setReportThreshold(1000); // 改为1GB

// 启用/禁用
trafficReporter.setEnabled(false);

// 获取配置
const config = trafficReporter.getConfig();
```

## API 集成

### 上报接口

- **端点**: `POST /api/v1/traffic/report`
- **认证**: Bearer Token (JWT)
- **请求数据**:
  ```json
  {
    "email": "user@example.com",
    "sessionId": "app_mac_v1-1672531200000-abc123",
    "uploadedMb": 123.45,
    "downloadedMb": 654.32,
    "timestamp": "2025-06-30T08:00:00Z"
  }
  ```

### 响应处理

```typescript
// 成功响应
{
  "status": "ok",
  "used": 1234.56,    // 当期累计使用流量(MB)
  "limit": 10240.00,  // 用户配额限制(MB)
  "message": null
}

// 配额超限响应
{
  "status": "over_quota",
  "used": 11000.25,
  "limit": 10240.00,
  "message": "Quota exceeded"
}
```

## 配额监控

### 自动处理

系统会自动处理以下配额状态：

- **正常状态** (`status: "ok"`)
  - 配额使用率 < 90%: 静默记录
  - 配额使用率 ≥ 90%: 控制台警告

- **超限状态** (`status: "over_quota"`)
  - 控制台错误日志
  - 可扩展用户通知

### 错误处理

所有错误都使用 `console.debug()` 静默处理，不会影响用户界面：

```typescript
trafficReporter.updateTraffic(uploadBytes, downloadBytes)
  .catch(error => {
    // 静默处理，不影响用户体验
    console.debug('[TrafficMonitor] 流量上报更新失败:', error);
  });
```

## 集成优势

### 1. 无侵入性

- ✅ 完全独立的WebSocket连接
- ✅ 不修改现有UI组件
- ✅ 不影响现有流量显示逻辑
- ✅ 后台静默运行

### 2. 高可靠性

- ✅ 独立错误处理
- ✅ 自动重连机制
- ✅ 状态持久化
- ✅ 认证状态感知

### 3. 易于维护

- ✅ 模块化设计
- ✅ 单一职责
- ✅ 清晰的API
- ✅ 完整的错误日志

## 调试和监控

### 控制台日志

流量监控会输出标识清晰的日志：

```
[TrafficMonitor] 🚀 启动独立流量监控...
[TrafficMonitor] ✅ 流量监控WebSocket连接已建立
[TrafficMonitor] 📊 流量监控已初始化
[TrafficMonitor] 流量上报更新失败: Network error (静默)
[TrafficMonitor] 🔄 流量统计已重置
[TrafficMonitor] 🧹 清理流量监控连接
```

### 调试方法

```typescript
// 在开发者控制台中
import { useTrafficMonitor } from '@/hooks/use-traffic-monitor';

// 获取统计信息
const stats = trafficMonitor.getTrafficStats();
console.log('流量统计:', stats);

// 手动测试上报
trafficReporter.manualReport(10, 20)
  .then(result => console.log('测试成功:', result))
  .catch(error => console.error('测试失败:', error));
```

## 环境配置

### 环境变量

```bash
# .env
VITE_API_BASE_URL=https://your-api-server.com
```

### 可选配置

```typescript
// 自定义上报阈值
trafficReporter.setReportThreshold(1000); // 1GB

// 临时禁用流量上报
trafficReporter.setEnabled(false);
```

## 故障排除

### 常见问题

1. **流量未上报**
   - 检查控制台是否有 `[TrafficMonitor]` 日志
   - 确认用户已认证
   - 检查WebSocket连接状态

2. **WebSocket连接失败**
   - 确认clash服务器地址正确
   - 检查网络连接
   - 查看错误日志

3. **上报API失败**
   - 检查认证token状态
   - 确认API端点配置
   - 查看详细错误信息

### 诊断命令

```typescript
// 检查流量监控状态
const stats = trafficMonitor.getTrafficStats();
console.log('初始化状态:', stats.isInitialized);
console.log('累计流量:', stats.totalUploadMB, 'MB ↑', stats.totalDownloadMB, 'MB ↓');

// 强制测试上报
trafficReporter.forceReport()
  .then(result => console.log('上报成功:', result))
  .catch(error => console.error('上报失败:', error));
```

## 更新日志

### v2.0.0 (当前版本)
- ✅ 完全独立的流量监控架构
- ✅ 不影响现有UI逻辑
- ✅ 静默错误处理
- ✅ 自动初始化和清理
- ✅ 更好的模块化设计

### v1.0.0 (已废弃)
- ❌ 侵入式修改UI组件
- ❌ 可能影响现有功能
- ❌ 错误处理不完善 