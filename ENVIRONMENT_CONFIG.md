# 环境配置指南 (Environment Configuration Guide)

## 概述 (Overview)

YI0YI-加速器支持根据不同环境自动切换API服务器URL，确保开发和生产环境使用正确的API端点。

## 环境检测机制 (Environment Detection)

系统会自动检测当前运行环境：

### 开发环境 (Development Environment)
满足以下任一条件时识别为开发环境：
- `import.meta.env.DEV === true`
- `import.meta.env.MODE === 'development'`
- `window.location.hostname === 'localhost'`
- `window.location.hostname === '127.0.0.1'`
- `window.location.port === '9097'`

### 生产环境 (Production Environment)
不满足开发环境条件时自动识别为生产环境。

## API URL 配置 (API URL Configuration)

### 默认配置 (Default Configuration)
- **开发环境**: `http://localhost:8080`
- **生产环境**: `https://api.101proxy.top`

### 环境变量配置 (Environment Variables)

创建 `.env` 文件来覆盖默认配置：

```bash
# .env 文件示例

# 指定API服务器URL（优先级最高）
VITE_API_BASE_URL=https://your-api-server.com

# 可选：指定API超时时间（毫秒）
VITE_API_TIMEOUT=10000
```

### 不同环境的配置示例 (Configuration Examples)

#### 开发环境 (.env.development)
```bash
VITE_API_BASE_URL=http://localhost:8080
```

#### 生产环境 (.env.production)
```bash
VITE_API_BASE_URL=https://api.101proxy.top
```

#### 测试环境 (.env.staging)
```bash
VITE_API_BASE_URL=https://staging-api.yi0yi.com
```

## 影响的功能模块 (Affected Modules)

以下功能会根据环境使用不同的API URL：

1. **用户认证 (Authentication)**
   - 登录 (`/api/auth/login`)
   - 登出 (`/api/auth/logout`)
   - Token刷新 (`/api/auth/refresh`)

2. **代理配置 (Proxy Configuration)**
   - 订阅配置获取 (`/api/subscription`)
   - 节点信息同步

3. **流量上报 (Traffic Reporting)**
   - 流量数据上报 (`/api/v1/traffic/report`)
   - 配额查询

## 使用方法 (Usage)

### 1. 开发环境
确保本地API服务器运行在 `http://localhost:8080`，或通过环境变量指定其他地址。

### 2. 生产环境
在 `src/services/api.ts` 中修改生产环境URL：

```typescript
// 在 getApiBaseUrl() 函数中修改
if (isDevelopment) {
  return 'http://localhost:8080';
} else {
  // 生产环境API服务器URL
  return 'https://api.101proxy.top';
}
```

### 3. 环境变量方式
创建对应的 `.env` 文件：

```bash
# 开发环境
echo "VITE_API_BASE_URL=http://localhost:8080" > .env.development

# 生产环境
echo "VITE_API_BASE_URL=https://api.101proxy.top" > .env.production
```

## 调试信息 (Debug Information)

应用启动时会在控制台输出环境检测信息：

```
🌍 Environment detected: {
  isDevelopment: true,
  isProduction: false,
  apiBaseUrl: "http://localhost:8080",
  hostname: "localhost",
  port: "9097"
}
```

## 安全注意事项 (Security Notes)

1. **生产环境**: 确保使用HTTPS协议
2. **环境变量**: 不要在代码中硬编码敏感信息
3. **CORS配置**: 确保API服务器正确配置CORS策略

## 故障排除 (Troubleshooting)

### 常见问题

1. **API请求失败**
   - 检查网络连接
   - 验证API服务器地址是否正确
   - 查看浏览器控制台的环境检测信息

2. **认证失败**
   - 确认API服务器支持JWT认证
   - 检查token是否过期
   - 验证API端点路径是否正确

3. **CORS错误**
   - 在API服务器中添加允许的源地址
   - 开发环境: `http://localhost:9097`
   - 生产环境: 您的应用域名

### 调试步骤

1. 打开浏览器开发者工具
2. 查看控制台的环境检测信息
3. 检查网络标签页中的API请求
4. 验证请求URL是否符合预期

## 更新历史 (Change Log)

- **v1.0.0**: 初始版本，支持开发/生产环境自动切换
- **v1.0.1**: 添加环境变量支持
- **v1.0.2**: 增强环境检测机制 