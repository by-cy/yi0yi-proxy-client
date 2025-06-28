# Yi0Yi Proxy 部署指南

## 🚀 快速开始

我已经为您的Yi0Yi Proxy项目创建了两个GitHub Actions工作流：

1. **`.github/workflows/release-desktop.yml`** - 正式发布工作流
2. **`.github/workflows/build-test.yml`** - 测试构建工作流

## 📋 必需的环境变量设置

### 最小配置（开始测试）

要开始测试构建，您只需要设置基本的Tauri签名密钥：

```bash
# 1. 安装Tauri CLI（如果还没有）
cargo install tauri-cli

# 2. 生成签名密钥
tauri signer generate -w ~/.tauri/yi0yi-proxy.key

# 3. 查看生成的密钥
cat ~/.tauri/yi0yi-proxy.key
```

在GitHub仓库中设置这些Secrets：
- `TAURI_PRIVATE_KEY`: 复制整个密钥文件内容
- `TAURI_KEY_PASSWORD`: 您设置的密钥密码

### 完整配置（生产发布）

对于完整的生产发布，特别是macOS应用，您需要Apple开发者证书：

#### Apple开发者配置
1. **获取Apple开发者账号** ($99/年)
2. **创建"Developer ID Application"证书**
3. **导出证书为.p12格式**
4. **设置以下Secrets**:
   - `APPLE_CERTIFICATE` - base64编码的.p12证书
   - `APPLE_CERTIFICATE_PASSWORD` - 证书密码
   - `APPLE_SIGNING_IDENTITY` - 证书名称
   - `APPLE_ID` - Apple开发者邮箱
   - `APPLE_PASSWORD` - App专用密码
   - `APPLE_TEAM_ID` - 团队ID

## 🔧 使用方法

### 1. 测试构建（推荐先使用）

使用 `build-test.yml` 工作流进行测试：

1. 进入GitHub仓库的 **Actions** 页面
2. 选择 **"Test Build"** 工作流
3. 点击 **"Run workflow"**
4. 选择要构建的平台：
   - `windows-x64` - Windows 64位
   - `windows-arm64` - Windows ARM64
   - `macos-intel` - macOS Intel芯片
   - `macos-apple-silicon` - macOS Apple芯片
   - `all` - 所有平台

### 2. 正式发布

使用 `release-desktop.yml` 工作流进行正式发布：

#### 方法一：手动触发
1. 进入GitHub仓库的 **Actions** 页面
2. 选择 **"Release Desktop Apps"** 工作流
3. 点击 **"Run workflow"**
4. 输入版本号（如 `v2.2.4`）

#### 方法二：标签触发
```bash
# 创建并推送标签
git tag v2.2.4
git push origin v2.2.4
```

## 📦 构建产物

### Windows
- `*-x86_64-pc-windows-msvc-setup.exe` - Windows x64安装包
- `*-aarch64-pc-windows-msvc-setup.exe` - Windows ARM64安装包

### macOS
- `*-x86_64-apple-darwin.dmg` - macOS Intel版本
- `*-aarch64-apple-darwin.dmg` - macOS Apple Silicon版本

## 🔍 工作流特性

### Release Desktop Apps 特性
- ✅ 多平台同时构建（Windows x64/ARM64, macOS Intel/Apple Silicon）
- ✅ 自动代码签名
- ✅ 生成自动更新元数据
- ✅ 创建GitHub Release
- ✅ 优化的缓存策略
- ✅ 详细的发布说明

### Test Build 特性
- ✅ 可选择单个或所有平台构建
- ✅ 无需完整签名配置即可测试
- ✅ 构建工件自动上传
- ✅ 7天自动清理
- ✅ 详细的构建摘要

## 🚧 故障排除

### 常见问题

#### 1. "TAURI_PRIVATE_KEY not found"
**解决方法**: 检查GitHub Secrets中的密钥设置
```bash
# 重新生成密钥
tauri signer generate -w ~/.tauri/yi0yi-proxy.key
# 确保复制完整内容到GitHub Secrets
```

#### 2. "pnpm check failed"
**解决方法**: 检查Rust目标是否支持
```bash
# 本地测试
pnpm check x86_64-pc-windows-msvc
```

#### 3. macOS签名失败
**解决方法**: 验证Apple证书配置
- 确认证书有效期
- 检查Team ID是否正确
- 验证App专用密码

### 调试建议

1. **先使用Test Build测试** - 在没有完整签名配置时测试基本构建
2. **检查Actions日志** - 查看详细的错误信息
3. **逐步添加平台** - 先在一个平台测试成功再扩展

## 📈 优化建议

### 构建速度优化
- 工作流已包含Rust和pnpm缓存
- 使用 `fail-fast: false` 确保其他平台构建不受影响

### 安全最佳实践
- 所有敏感信息使用GitHub Secrets
- 密钥定期轮换
- 限制工作流权限

## 🎯 下一步

1. **测试基本构建**: 使用Test Build工作流测试Windows x64构建
2. **配置签名**: 设置Tauri签名密钥
3. **添加平台**: 逐步添加其他平台的支持
4. **生产发布**: 配置完整的Apple签名后进行正式发布

## 📞 支持

如果在部署过程中遇到问题，请：
1. 检查GitHub Actions日志
2. 验证所有必需的Secrets是否正确设置
3. 确认本地构建是否正常工作 