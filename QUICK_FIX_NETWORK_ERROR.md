# 🚨 登录网络错误快速修复指南

## 问题描述
用户在生产环境下登录时遇到 "Network error. Please check your connection." 错误。

## 根本原因
经过诊断发现，问题不是网络连接，而是APP ID配置问题：
- 网络连接正常 ✅
- API服务器可访问 ✅ 
- 但服务器返回 `{"error":"Invalid APP ID: BROWSER"}` ❌

## 解决方案

### 1. 立即修复 (已实施)
✅ **强化APP ID检测逻辑**
- 改进了Tauri应用的环境检测
- 在Tauri应用中默认使用MAC APP ID而非BROWSER
- 添加了详细的调试日志

### 2. 用户调试步骤

#### 步骤1: 检查环境信息
在应用中打开开发者工具 (F12)，在控制台运行：
```javascript
debugYi0YiEnvironment()
```

#### 步骤2: 查看APP ID检测
注意控制台中的APP ID检测日志：
```
🔍 检测APP ID...
📱 是否为Tauri应用: true/false
🖥️ 平台信息: { platform: "...", userAgent: "..." }
✅ 检测为XXX平台，使用APP_XXX
```

#### 步骤3: 确认API配置
检查控制台中的环境检测信息：
```
🌍 Environment detected: {
  isDevelopment: false,
  isProduction: true,
  isTauriApp: true,
  apiBaseUrl: "https://api.101proxy.top"
}
```

### 3. 预期结果

修复后，用户应该看到：
- Tauri应用中：`APP_MAC` 或 `APP_WINDOWS`
- 浏览器环境中：根据平台选择相应的APP ID
- 不再使用 `BROWSER` APP ID (除非确实在浏览器中运行)

### 4. 如果问题仍然存在

#### 选项A: 临时强制使用MAC APP ID
在控制台运行：
```javascript
localStorage.setItem('forceAppId', 'app_mac_v1');
location.reload();
```

#### 选项B: 检查服务器支持的APP ID列表
联系管理员确认 `api.101proxy.top` 支持的APP ID列表。

#### 选项C: 回退到开发环境测试
创建 `.env` 文件：
```bash
VITE_API_BASE_URL=http://localhost:8080
```

### 5. 验证修复

成功修复后，登录过程应显示：
```
🚀 Starting login...
👤 Email: user@example.com
🔍 检测APP ID...
📱 是否为Tauri应用: true
✅ 检测为Mac平台，使用APP_MAC
📱 App ID: app_mac_v1
✅ Login successful
```

### 6. 技术细节

**修改的文件：**
- `src/services/auth-service.ts` - 强化APP ID检测
- `src/services/api.ts` - 改进环境检测
- `src/utils/debug-environment.ts` - 新增调试工具

**关键改进：**
- Tauri应用优先使用平台特定的APP ID
- 添加了Tauri环境检测的fallback逻辑
- 提供了详细的调试信息

### 7. 防止未来问题

1. **构建验证**: 每次release前运行环境检测测试
2. **日志监控**: 监控生产环境中的APP ID使用情况
3. **API文档**: 维护支持的APP ID列表文档

---

**需要帮助？**
- 检查控制台调试信息
- 运行 `pnpm run diagnose-network` 进行网络诊断
- 联系开发团队获取技术支持 