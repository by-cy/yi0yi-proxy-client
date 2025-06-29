# Yi0Yi Proxy - Production Configuration Verification Guide

## 🎯 概述

本指南帮助您确认 GitHub Actions 构建过程中正确使用了 Clerk 生产环境配置。

## 🔍 验证方法

### 方法 1: GitHub Actions 日志验证

在 GitHub Actions 运行时，您会看到以下验证步骤：

#### 构建前验证
```bash
🔍 Verifying Clerk Production Configuration...
📦 Build Environment: CI
🔑 Clerk Publishable Key: pk_live_Y2xlcmsuMTAxcHJveHkudG9w
🌐 Clerk Frontend API: https://clerk.101proxy.top
✅ Production configuration confirmed
```

#### Clerk 服务日志（构建过程中）
```bash
🏗️ CI Build Environment Detected
📦 Environment: production
🔑 Publishable Key: pk_live_Y2xlcmsuMTAxcHJveHkudG9w
🌐 Frontend API: https://clerk.101proxy.top
```

#### 构建后验证
```bash
🔍 Verifying build configuration...
✅ Build completed successfully with production Clerk configuration
🔑 Used Clerk Key: pk_live_Y2xlcmsuMTAxcHJveHkudG9w
🌐 Used Frontend API: https://clerk.101proxy.top
📦 Environment: production

🔍 Checking built files for production configuration...
✅ Production Clerk key found in build artifacts
✅ Production Clerk API URL found in build artifacts
```

### 方法 2: 本地验证脚本

运行本地验证脚本检查配置：

```bash
# 设置生产环境变量
export VITE_CLERK_PUBLISHABLE_KEY=pk_live_Y2xlcmsuMTAxcHJveHkudG9w
export VITE_CLERK_FRONTEND_API=https://clerk.101proxy.top
export NODE_ENV=production

# 构建应用
pnpm build

# 运行验证脚本
pnpm verify-config
```

预期输出：
```bash
🔍 Yi0Yi Proxy - Production Configuration Verification
================================================

📋 Environment Variables Check:
✅ VITE_CLERK_PUBLISHABLE_KEY: pk_live_Y2xlcmsuMTAxcHJveHkudG9w
   ✅ Production Clerk key detected
✅ VITE_CLERK_FRONTEND_API: https://clerk.101proxy.top
   ✅ Production API URL confirmed

📦 Build Files Check:
✅ Build directory found
✅ Production Clerk key found in build files
   Files: 2
✅ Production API URL found in build files
   Files: 3
✅ No development keys found in build files

📊 Configuration Report:
========================
🌍 Environment: production
🔑 Clerk Key: pk_live_Y2xlcmsuMTAxcHJveHkudG9w
🌐 Clerk API: https://clerk.101proxy.top
⏰ Check Time: 2024-01-15T10:30:00.000Z
🏗️ CI Environment: No

🎯 Production Configuration: ✅ YES

==================================================
🎉 SUCCESS: Production configuration verified!
```

### 方法 3: GitHub Actions 环境验证

1. **检查 Workflow 文件**
   
   在 `.github/workflows/yi0yi-release.yml` 中确认：
   ```yaml
   env:
     # Clerk Production Configuration
     VITE_CLERK_PUBLISHABLE_KEY: pk_live_Y2xlcmsuMTAxcHJveHkudG9w
     VITE_CLERK_FRONTEND_API: https://clerk.101proxy.top
     NODE_ENV: production
   ```

2. **查看 Actions 运行日志**
   
   - 前往 GitHub Repository → Actions
   - 选择最新的构建任务
   - 查看 "Verify Clerk Production Configuration" 步骤
   - 确认显示正确的生产配置

3. **检查构建产物**
   
   - 在 Actions 日志中查看 "Verify Build Configuration" 步骤
   - 确认显示找到生产配置

### 方法 4: 下载后应用验证

1. **下载构建的应用**
   - Windows: 下载 `.msi` 安装包
   - macOS: 下载 `.app` 应用包

2. **安装并启动应用**

3. **检查网络请求**
   - 打开开发者工具（如果支持）
   - 或使用网络监控工具
   - 确认应用请求发送到 `https://clerk.101proxy.top`

4. **查看应用日志**
   - 应用启动时会显示 Clerk 配置信息
   - 确认使用的是生产密钥

## 🚨 问题排查

### 如果验证失败

#### 问题 1: GitHub Actions 中环境变量未设置
**症状:** Actions 日志显示环境变量为空或使用开发配置

**解决方案:**
1. 检查 `.github/workflows/yi0yi-release.yml` 文件
2. 确认 `env` 部分包含正确的生产配置
3. 提交并推送更改

#### 问题 2: 构建文件中未找到生产配置
**症状:** 验证脚本显示构建文件中未找到生产密钥

**解决方案:**
1. 确保构建过程使用了正确的环境变量
2. 清理构建缓存：`rm -rf dist node_modules/.vite`
3. 重新构建：`pnpm build`

#### 问题 3: 应用仍然使用开发配置
**症状:** 下载的应用仍然连接到开发环境

**解决方案:**
1. 检查 GitHub Actions 构建时间
2. 确认下载的是最新构建版本
3. 检查 Tauri 配置文件是否正确

## 📋 检查清单

在发布前确认以下项目：

- [ ] GitHub Actions workflow 包含正确的生产环境变量
- [ ] Actions 运行日志显示生产配置验证成功
- [ ] 构建产物验证通过
- [ ] 验证脚本本地运行成功
- [ ] 下载的应用连接到生产 Clerk 服务

## 🛠️ 相关文件

- **GitHub Actions 配置**: `.github/workflows/yi0yi-release.yml`
- **Clerk 服务配置**: `src/services/clerk.ts`
- **验证脚本**: `scripts/verify-production-config.js`
- **环境配置说明**: `env-setup.txt`
- **问题排查指南**: `CLERK_TROUBLESHOOTING.md`

## 📞 支持

如果遇到配置问题：

1. 查看 `CLERK_TROUBLESHOOTING.md` 详细排查指南
2. 运行 `pnpm verify-config` 获取详细诊断信息
3. 检查 GitHub Actions 构建日志
4. 确认所有相关配置文件

---

✅ **记住**: 生产配置验证是确保应用正确连接到生产 Clerk 服务的关键步骤！ 