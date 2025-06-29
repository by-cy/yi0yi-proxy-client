# 🚨 Clerk 401 错误故障排除指南

## 问题描述

如果你在构建后的应用中看到类似以下错误：

```
URL: https://supreme-javelin-47.clerk.accounts.dev/v1/client
Status: 401 Unauthorized
```

这是因为 **使用了开发环境的 Clerk 配置进行生产构建**。

## 🔍 根本原因

### 当前配置问题
- **Publishable Key**: `pk_test_xxx` (开发环境)
- **Frontend API**: `https://supreme-javelin-47.clerk.accounts.dev` (开发实例)

### 为什么会失败？
1. **环境隔离**: Clerk 严格区分开发和生产环境
2. **域名限制**: 开发应用通常只允许 `localhost` 访问
3. **Key 权限**: `pk_test_` 密钥在生产环境中被限制

## ✅ 解决方案

### 方案 1: 创建 Clerk Production 应用 (推荐)

#### 步骤 1: 在 Clerk Dashboard 创建 Production 应用
1. 访问 [Clerk Dashboard](https://dashboard.clerk.com)
2. 点击 "Create Application" 或升级现有应用
3. 选择 "Production" 环境
4. 复制新的密钥（以 `pk_live_` 开头）

#### 步骤 2: 创建生产环境配置
在项目根目录创建 `.env.production` 文件：

```bash
# Clerk Production Configuration
VITE_CLERK_PUBLISHABLE_KEY=pk_live_Y2xlcmsuMTAxcHJveHkudG9wJA
VITE_CLERK_FRONTEND_API=https://clerk.101proxy.top
NODE_ENV=production
```

#### 步骤 3: 重新构建
```bash
pnpm build  # 会自动使用 .env.production 配置
```

### 方案 2: 配置开发应用的域名白名单

如果你想继续使用开发环境：

1. 登录 [Clerk Dashboard](https://dashboard.clerk.com)
2. 选择你的应用
3. 进入 **Settings** → **Domains**
4. 添加允许的域名：
   - 你的应用运行域名
   - 或临时添加 `*`（不推荐，安全风险）

### 方案 3: 环境变量动态配置

如果你已经按照我的修改进行了配置，现在支持环境变量：

```bash
# 设置环境变量后构建
export VITE_CLERK_PUBLISHABLE_KEY=pk_live_Y2xlcmsuMTAxcHJveHkudG9wJA
export VITE_CLERK_FRONTEND_API=https://clerk.101proxy.top
pnpm build
```

## 🚀 GitHub Actions 配置

如果你使用 GitHub Actions 自动构建，需要设置 Secrets：

1. 进入 GitHub Repository → Settings → Secrets and variables → Actions
2. 添加以下 Secrets：
   - `VITE_CLERK_PUBLISHABLE_KEY_PROD`: 你的生产 publishable key
   - `VITE_CLERK_FRONTEND_API_PROD`: 你的生产 frontend API URL

## 🔧 验证配置

### 检查当前使用的密钥
在浏览器控制台运行：
```javascript
console.log('Current Clerk Key:', import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);
```

### 正确的输出应该是：
- **开发环境**: `pk_test_xxx` 
- **生产环境**: `pk_live_xxx`

## 📝 最佳实践

1. **分离环境**: 始终为开发和生产使用不同的 Clerk 应用
2. **安全存储**: 生产密钥存储在环境变量中，不要提交到代码库
3. **域名配置**: 为生产应用配置正确的允许域名
4. **测试验证**: 构建前在本地测试生产配置

## 🆘 还是有问题？

如果按照上述步骤仍然有问题，请检查：

1. **网络连接**: 确认可以访问 Clerk 服务
2. **密钥格式**: 确认密钥完整且格式正确
3. **环境变量**: 确认构建时环境变量正确加载
4. **缓存清理**: 清除浏览器缓存和应用缓存

## 🔗 相关链接

- [Clerk 官方文档](https://clerk.com/docs)
- [Clerk Dashboard](https://dashboard.clerk.com)
- [环境配置指南](./env-setup.txt) 