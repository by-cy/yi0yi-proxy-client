# Clerk Tauri Origin 配置指南

## 🎯 概述

本指南帮助你配置 Clerk 允许 Tauri 应用的 Origin，确保 Tauri 应用能够正常进行 Clerk 身份验证。

## 🔑 前提条件

你需要获取 Clerk **Secret Key** (不是 Publishable Key)：

### 开发环境
- Secret Key 格式: `sk_test_xxxxxxxxxx`
- 用于测试和开发

### 生产环境  
- Secret Key 格式: `sk_live_xxxxxxxxxx`
- 用于生产环境，需要小心操作

## 📋 获取 Clerk Secret Key

1. 登录 [Clerk Dashboard](https://dashboard.clerk.com/)
2. 选择你的应用
3. 前往 **Settings** → **API Keys** 
4. 在 **Secret Keys** 部分找到并复制密钥

⚠️ **重要**: Secret Key 具有管理员权限，请妥善保管！

## 🔧 配置方法

### 方法 1: 使用自动化脚本（推荐）

我们提供了自动化脚本来配置 Clerk Origins：

```bash
# 1. 设置 Secret Key 环境变量
export CLERK_SECRET_KEY=sk_live_your_secret_key_here

# 2. 运行配置脚本
pnpm configure-clerk

# 或者直接运行脚本
node scripts/configure-clerk-origins.js
```

#### 脚本会自动添加以下 Origins:
- `tauri://localhost` - Tauri 默认 Origin
- `https://clerk.101proxy.top` - 生产环境 Clerk 域名
- `http://localhost:3000` - 开发环境
- `http://localhost:5173` - Vite 开发服务器

#### 预期输出:
```bash
🔧 Clerk Origin Configuration Tool
==================================

🔑 Using PRODUCTION Secret Key
📦 Key: sk_live_Y2xlcm...

⚠️  WARNING: You are configuring PRODUCTION Clerk instance
⏰ Waiting 3 seconds... Press Ctrl+C to cancel
🚀 Proceeding with production configuration...

📡 Fetching current Clerk instance configuration...
✅ Current instance retrieved successfully
📛 Instance ID: ins_xxxxxxxxxx
🌐 Current allowed origins: []

📝 Updating allowed origins...
Current origins: []
Adding Tauri origins: ["tauri://localhost", "https://clerk.101proxy.top", ...]
Final origins: ["tauri://localhost", "https://clerk.101proxy.top", ...]

✅ SUCCESS: Clerk origins configured successfully!
📋 Updated Configuration:
   Instance ID: ins_xxxxxxxxxx
   Allowed Origins: [
     "tauri://localhost",
     "https://clerk.101proxy.top",
     "http://localhost:3000",
     "http://localhost:5173"
   ]

🎉 Tauri app should now be able to authenticate with Clerk!

🔍 Verification:
✅ All Tauri origins have been added successfully
```

### 方法 2: 手动 API 调用

如果你更喜欢手动操作，可以直接调用 Clerk Admin API：

```bash
curl -X PATCH https://api.clerk.com/v1/instance \
  -H "Authorization: Bearer sk_live_your_secret_key" \
  -H "Content-Type: application/json" \
  -d '{
    "allowed_origins": [
      "tauri://localhost",
      "https://clerk.101proxy.top",
      "http://localhost:3000",
      "http://localhost:5173"
    ]
  }'
```

## 🔍 验证配置

### 1. 检查 Clerk Dashboard

1. 登录 Clerk Dashboard
2. 前往 **Settings** → **Domains**
3. 确认 **Allowed Origins** 包含:
   - `tauri://localhost`
   - `https://clerk.101proxy.top`

### 2. 测试 Tauri 应用

```bash
# 构建并运行 Tauri 应用
pnpm build
pnpm tauri build

# 或开发模式
pnpm dev
```

在应用中尝试登录，应该不再出现 CORS 错误。

### 3. 检查浏览器控制台

如果仍有问题，打开开发者工具查看：
- 网络请求是否发送到正确的域名
- 是否有 CORS 相关错误
- Clerk 初始化是否成功

## 🚨 问题排查

### 问题 1: CORS 错误 "Access-Control-Allow-Origin"

**症状**: 
```
Access to fetch at 'https://clerk.101proxy.top/v1/client' from origin 'tauri://localhost' has been blocked by CORS policy
```

**解决方案**:
1. 确认 Allowed Origins 配置正确
2. 检查使用的 Secret Key 是否有权限
3. 验证 Tauri Origin 是否准确

### 问题 2: 401 Unauthorized 错误

**症状**: API 调用返回 401 错误

**解决方案**:
1. 检查 Secret Key 是否正确
2. 确认 Secret Key 有管理员权限
3. 验证 API 端点是否正确

### 问题 3: Tauri Origin 不匹配

**症状**: 配置了 Origins 但仍然 CORS 错误

**解决方案**:
1. 检查实际的 Tauri Origin:
   ```javascript
   console.log('Current origin:', window.location.origin);
   ```
2. 确认 CSP 配置允许 Clerk 域名
3. 检查是否有自定义协议配置

## 📊 支持的 Origins

根据你的应用配置，可能需要以下 Origins：

| Origin | 使用场景 |
|--------|----------|
| `tauri://localhost` | 默认 Tauri 应用 |
| `https://tauri.localhost` | 一些 Tauri 配置 |
| `https://clerk.101proxy.top` | 生产环境 Clerk 域名 |
| `http://localhost:3000` | 开发环境 |
| `http://localhost:5173` | Vite 开发服务器 |

## 🛠️ 相关文件

这个配置过程涉及以下文件：

- **配置脚本**: `scripts/configure-clerk-origins.js`
- **Tauri 配置**: `src-tauri/tauri.conf.json` (CSP 配置)
- **Clerk 服务**: `src/services/clerk.ts`
- **包管理器**: `package.json` (添加了 `configure-clerk` 脚本)

## 📞 支持

如果遇到问题：

1. 运行 `pnpm configure-clerk --help` 查看帮助
2. 检查 `CLERK_TROUBLESHOOTING.md` 获取详细排查指南
3. 验证 Clerk Dashboard 中的配置
4. 查看浏览器开发者工具中的网络请求

---

✅ **记住**: 配置完成后，Tauri 应用就能正常使用 Clerk 身份验证了！ 