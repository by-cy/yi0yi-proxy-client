# API 配置说明

## 环境变量配置

在项目根目录创建 `.env` 文件，配置以下环境变量：

```bash
# API Configuration
VITE_API_BASE_URL=http://localhost:8080

# Development Settings  
NODE_ENV=development
```

## 生产环境配置

```bash
# Production API Configuration
VITE_API_BASE_URL=https://your-production-api.com

# Production Settings
NODE_ENV=production
```

## 支持的设备类型

根据 API 文档，系统会自动检测设备类型并使用对应的 APP ID：

- `app_mac_v1`: macOS 桌面应用
- `app_windows_v1`: Windows 桌面应用
- `app_browser_v1`: 浏览器网页版（备用）
- `app_android_v1`: Android 移动应用
- `app_ios_v1`: iOS 移动应用
- `app_payment_service`: 支付服务（内部使用）

## API 端点

- 登录: `POST /api/auth/login`
- 刷新Token: `POST /api/auth/refresh`
- 登出: `POST /api/auth/logout`

## 使用说明

1. 用户登录时会自动检测设备类型并发送对应的 APP ID
2. Access Token 有效期 3 小时，系统会自动刷新
3. Refresh Token 有效期 15 天
4. 登出时可选择单设备登出或全设备登出

## 设备检测逻辑

应用会按以下优先级检测设备类型：

1. **Tauri 环境检测** - 优先检测是否在 Tauri 应用中运行
   - Mac 平台 → `app_mac_v1`
   - Windows 平台 → `app_windows_v1`

2. **User Agent 检测** - 后备检测方法
   - 包含 "mac" → `app_mac_v1`
   - 包含 "win" → `app_windows_v1`
   - 其他情况 → `app_browser_v1` 