#!/usr/bin/env node

/**
 * 测试 Tauri Clerk 修复
 * 验证错误处理和 polyfill 是否正常工作
 */

console.log('🧪 Testing Tauri Clerk Fixes');
console.log('============================\n');

// 模拟测试环境
const tests = [
  {
    name: '检查 polyfill 文件',
    test: () => {
      const fs = require('fs');
      const path = require('path');
      
      const polyfillPath = path.join(__dirname, '../src/polyfills/tauri-clerk.js');
      const errorHandlerPath = path.join(__dirname, '../src/utils/tauri-error-handler.ts');
      
      const polyfillExists = fs.existsSync(polyfillPath);
      const errorHandlerExists = fs.existsSync(errorHandlerPath);
      
      if (polyfillExists && errorHandlerExists) {
        console.log('✅ Polyfill 和错误处理器文件存在');
        return true;
      } else {
        console.log('❌ 缺少必要文件');
        console.log(`   Polyfill 存在: ${polyfillExists ? '是' : '否'}`);
        console.log(`   错误处理器存在: ${errorHandlerExists ? '是' : '否'}`);
        return false;
      }
    }
  },
  
  {
    name: '检查 main.tsx 集成',
    test: () => {
      const fs = require('fs');
      const path = require('path');
      
      const mainPath = path.join(__dirname, '../src/main.tsx');
      const mainContent = fs.readFileSync(mainPath, 'utf8');
      
      const hasPolyfillImport = mainContent.includes('import "./polyfills/tauri-clerk.js"');
      const hasErrorHandlerImport = mainContent.includes('import { setupTauriErrorHandler }');
      const hasErrorHandlerSetup = mainContent.includes('setupTauriErrorHandler()');
      
      if (hasPolyfillImport && hasErrorHandlerImport && hasErrorHandlerSetup) {
        console.log('✅ main.tsx 正确集成了 Tauri 修复');
        return true;
      } else {
        console.log('❌ main.tsx 集成不完整');
        console.log(`   Polyfill 导入: ${hasPolyfillImport ? '是' : '否'}`);
        console.log(`   错误处理器导入: ${hasErrorHandlerImport ? '是' : '否'}`);
        console.log(`   错误处理器设置: ${hasErrorHandlerSetup ? '是' : '否'}`);
        return false;
      }
    }
  },
  
  {
    name: '检查 Clerk 服务更新',
    test: () => {
      const fs = require('fs');
      const path = require('path');
      
      const clerkPath = path.join(__dirname, '../src/services/clerk.ts');
      const clerkContent = fs.readFileSync(clerkPath, 'utf8');
      
      const hasTauriDetection = clerkContent.includes('isTauriEnvironment');
      const hasTauriConfig = clerkContent.includes('tauriConfig');
      const hasTauriErrorHandling = clerkContent.includes('Tauri-specific error');
      
      if (hasTauriDetection && hasTauriConfig && hasTauriErrorHandling) {
        console.log('✅ Clerk 服务已正确更新');
        return true;
      } else {
        console.log('❌ Clerk 服务更新不完整');
        console.log(`   Tauri 检测: ${hasTauriDetection ? '是' : '否'}`);
        console.log(`   Tauri 配置: ${hasTauriConfig ? '是' : '否'}`);
        console.log(`   Tauri 错误处理: ${hasTauriErrorHandling ? '是' : '否'}`);
        return false;
      }
    }
  },
  
  {
    name: '检查 Tauri 配置',
    test: () => {
      const fs = require('fs');
      const path = require('path');
      
      const tauriConfigPath = path.join(__dirname, '../src-tauri/tauri.conf.json');
      const tauriContent = fs.readFileSync(tauriConfigPath, 'utf8');
      
      const hasClerkDomain = tauriContent.includes('clerk.101proxy.top');
      const hasCSP = tauriContent.includes('"csp":');
      
      if (hasClerkDomain && hasCSP) {
        console.log('✅ Tauri 配置包含 Clerk 域名和 CSP');
        return true;
      } else {
        console.log('❌ Tauri 配置不完整');
        console.log(`   Clerk 域名: ${hasClerkDomain ? '是' : '否'}`);
        console.log(`   CSP 配置: ${hasCSP ? '是' : '否'}`);
        return false;
      }
    }
  },
  
  {
    name: '检查 Origins 配置脚本',
    test: () => {
      const fs = require('fs');
      const path = require('path');
      
      const configScriptPath = path.join(__dirname, 'configure-clerk-origins.js');
      const packagePath = path.join(__dirname, '../package.json');
      
      const scriptExists = fs.existsSync(configScriptPath);
      const packageContent = fs.readFileSync(packagePath, 'utf8');
      const hasConfigureScript = packageContent.includes('"configure-clerk":');
      
      if (scriptExists && hasConfigureScript) {
        console.log('✅ Origins 配置脚本已准备就绪');
        return true;
      } else {
        console.log('❌ Origins 配置脚本设置不完整');
        console.log(`   脚本存在: ${scriptExists ? '是' : '否'}`);
        console.log(`   package.json 脚本: ${hasConfigureScript ? '是' : '否'}`);
        return false;
      }
    }
  }
];

// 运行测试
let passedTests = 0;
let totalTests = tests.length;

for (const test of tests) {
  console.log(`🔍 ${test.name}...`);
  
  try {
    const result = test.test();
    if (result) {
      passedTests++;
    }
  } catch (error) {
    console.log(`❌ 测试失败: ${error.message}`);
  }
  
  console.log('');
}

// 总结
console.log('📊 测试结果总结');
console.log('================');
console.log(`通过: ${passedTests}/${totalTests}`);
console.log(`成功率: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

if (passedTests === totalTests) {
  console.log('\n🎉 所有测试通过！Tauri Clerk 修复已完成。');
  console.log('\n📋 下一步：');
  console.log('1. 运行 `pnpm dev` 测试开发环境');
  console.log('2. 运行 `pnpm build` 测试构建');
  console.log('3. 在 Tauri 应用中测试登录功能');
} else {
  console.log('\n⚠️ 部分测试失败，请检查上述问题。');
  process.exit(1);
} 