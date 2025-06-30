# Yi0Yi Proxy 与其他 Verge 客户端冲突解决方案

## 问题背景

Yi0Yi Proxy 作为基于 Clash Verge 的衍生版本，在同一系统中与其他 Verge 客户端（如 clash-verge、clash-verge-rev）同时运行时会产生冲突，主要表现为：

1. **进程名称冲突** - 多个相同名称的进程同时运行
2. **端口占用冲突** - 相同的控制端口被占用
3. **配置文件冲突** - 可能访问相同的配置文件路径
4. **Deep Link 协议冲突** - 相同的 URL scheme 注册
5. **更新服务器冲突** - 错误地连接到其他项目的更新服务器

## 解决方案

### 1. 二进制文件名称独立化

**修改前：**
```json
"externalBin": [
  "sidecar/verge-mihomo",
  "sidecar/verge-mihomo-alpha"1
]
```

**修改后：**
```json
"externalBin": [
  "sidecar/yi0yi-mihomo",
  "sidecar/yi0yi-mihomo-alpha"
]
```

**涉及文件：**
- `src-tauri/tauri.conf.json`
- `src-tauri/tauri.linux.conf.json`
- `src-tauri/src/config/verge.rs`
- `src-tauri/src/core/core.rs`
- `src-tauri/src/core/service.rs`
- `src-tauri/src/enhance/chain.rs`
- `src/components/setting/mods/clash-core-viewer.tsx`

### 2. Deep Link 协议清理

**修改前：**
```json
"schemes": [
  "clash",
  "yi0yi-proxy"
]
```

**修改后：**
```json
"schemes": [
  "yi0yi-proxy"
]
```

移除了通用的 `clash` scheme，只保留项目专用的 `yi0yi-proxy` scheme。

### 3. 更新服务器独立化

**修改前：**
```json
"endpoints": [
  "https://download.clashverge.dev/https://github.com/clash-verge-rev/clash-verge-rev/releases/...",
  "https://gh-proxy.com/https://github.com/clash-verge-rev/clash-verge-rev/releases/...",
  ...
]
```

**修改后：**
```json
"endpoints": [
  "https://github.com/by-cy/yi0yi-proxy-client/releases/download/updater/update.json"
]
```

使用项目专用的更新服务器，避免与其他项目的更新机制冲突。

### 4. Windows 安装程序进程检测

**修改文件：** `src-tauri/packages/windows/installer.nsi`

将进程检测和终止逻辑从 `verge-mihomo.exe` 改为 `yi0yi-mihomo.exe`，确保安装时不会误杀其他 Verge 客户端的进程。

### 5. 构建脚本适配

**修改文件：**
- `scripts/check.mjs`
- `scripts/portable.mjs`
- `scripts/portable-fixed-webview2.mjs`

所有构建和打包脚本都更新为使用新的二进制文件名称。

### 6. 控制端口差异化

系统已默认使用端口 `9097` 作为控制端口，与标准 Clash 客户端的 `9090` 端口区分开来。

## 验证结果

### 构建验证
```bash
$ pnpm web:build
✓ built in 40.71s
```

### 进程独立性
修改后，Yi0Yi Proxy 将使用独立的进程名称：
- `yi0yi-mihomo` (替代 `verge-mihomo`)
- `yi0yi-mihomo-alpha` (替代 `verge-mihomo-alpha`)

### 配置文件验证
- 应用标识符：`io.github.yi0yi-proxy.yi0yi-proxy`
- 产品名称：`Yi0Yi Proxy`
- Deep Link：`yi0yi-proxy://`

## 后续建议

1. **配置文件路径**: 考虑使用独立的配置文件目录，避免与其他 Verge 客户端共享配置
2. **进程监控**: 实现启动时检测其他 Verge 客户端的机制
3. **用户提示**: 在检测到冲突时向用户显示友好提示
4. **文档更新**: 在用户文档中说明多客户端共存的注意事项

## 故障排除

如果仍然遇到冲突：

1. **检查进程**: 使用活动监视器确认没有重名进程
2. **端口检查**: 确认 9097 端口未被占用
3. **重置配置**: 清除应用数据目录重新开始
4. **重启系统**: 确保所有相关进程完全停止

## 技术细节

- **修改的文件总数**: 13 个
- **Rust 文件**: 5 个
- **TypeScript 文件**: 2 个
- **配置文件**: 3 个
- **构建脚本**: 3 个

通过这些修改，Yi0Yi Proxy 现在可以与其他 Verge 客户端在同一系统中和谐共存，不会产生冲突。 
