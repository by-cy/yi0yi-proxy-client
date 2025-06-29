#!/usr/bin/env node

/**
 * 验证生产环境配置脚本
 * 用于确认 Clerk 生产配置是否正确应用
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Yi0Yi Proxy - Production Configuration Verification');
console.log('================================================\n');

// 检查环境变量
function checkEnvironmentVariables() {
  console.log('📋 Environment Variables Check:');
  
  const requiredVars = [
    'VITE_CLERK_PUBLISHABLE_KEY',
    'VITE_CLERK_FRONTEND_API'
  ];
  
  let allPresent = true;
  
  requiredVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
      console.log(`✅ ${varName}: ${value}`);
      
      // 验证生产环境配置
      if (varName === 'VITE_CLERK_PUBLISHABLE_KEY') {
        if (value.startsWith('pk_live_')) {
          console.log('   ✅ Production Clerk key detected');
        } else {
          console.log('   ⚠️ Using development Clerk key');
        }
      }
      
      if (varName === 'VITE_CLERK_FRONTEND_API') {
        if (value === 'https://clerk.101proxy.top') {
          console.log('   ✅ Production API URL confirmed');
        } else {
          console.log(`   ⚠️ API URL: ${value}`);
        }
      }
    } else {
      console.log(`❌ ${varName}: NOT SET`);
      allPresent = false;
    }
  });
  
  return allPresent;
}

// 检查构建文件
function checkBuildFiles() {
  console.log('\n📦 Build Files Check:');
  
  const distPath = path.join(process.cwd(), 'dist');
  
  if (!fs.existsSync(distPath)) {
    console.log('❌ Build directory (dist) not found');
    console.log('   Run: pnpm build first');
    return false;
  }
  
  console.log('✅ Build directory found');
  
  // 递归搜索文件中的配置
  function searchInFiles(dir, searchTerms) {
    const files = fs.readdirSync(dir);
    const results = {};
    
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        const subResults = searchInFiles(filePath, searchTerms);
        Object.assign(results, subResults);
      } else if (file.endsWith('.js') || file.endsWith('.html')) {
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          
          searchTerms.forEach(term => {
            if (content.includes(term)) {
              if (!results[term]) results[term] = [];
              results[term].push(filePath);
            }
          });
        } catch (error) {
          // 忽略读取错误
        }
      }
    });
    
    return results;
  }
  
  const searchTerms = [
    'pk_live_Y2xlcmsuMTAxcHJveHkudG9w',
    'clerk.101proxy.top',
    'pk_test_'  // 检查是否有开发密钥残留
  ];
  
  const results = searchInFiles(distPath, searchTerms);
  
  // 检查生产配置
  if (results['pk_live_Y2xlcmsuMTAxcHJveHkudG9w']) {
    console.log('✅ Production Clerk key found in build files');
    console.log(`   Files: ${results['pk_live_Y2xlcmsuMTAxcHJveHkudG9w'].length}`);
  } else {
    console.log('❌ Production Clerk key NOT found in build files');
  }
  
  if (results['clerk.101proxy.top']) {
    console.log('✅ Production API URL found in build files');
    console.log(`   Files: ${results['clerk.101proxy.top'].length}`);
  } else {
    console.log('❌ Production API URL NOT found in build files');
  }
  
  // 检查开发配置残留
  if (results['pk_test_']) {
    console.log('⚠️ Development keys found in build files (should be removed)');
    console.log(`   Files: ${results['pk_test_'].length}`);
  } else {
    console.log('✅ No development keys found in build files');
  }
  
  return true;
}

// 生成配置报告
function generateReport() {
  console.log('\n📊 Configuration Report:');
  console.log('========================');
  
  const config = {
    environment: process.env.NODE_ENV || 'development',
    clerkKey: process.env.VITE_CLERK_PUBLISHABLE_KEY || 'NOT SET',
    clerkAPI: process.env.VITE_CLERK_FRONTEND_API || 'NOT SET',
    buildTime: new Date().toISOString(),
    ci: !!process.env.CI
  };
  
  console.log(`🌍 Environment: ${config.environment}`);
  console.log(`🔑 Clerk Key: ${config.clerkKey}`);
  console.log(`🌐 Clerk API: ${config.clerkAPI}`);
  console.log(`⏰ Check Time: ${config.buildTime}`);
  console.log(`🏗️ CI Environment: ${config.ci ? 'Yes' : 'No'}`);
  
  // 判断是否为生产配置
  const isProduction = 
    config.clerkKey.startsWith('pk_live_') &&
    config.clerkAPI === 'https://clerk.101proxy.top';
  
  console.log(`\n🎯 Production Configuration: ${isProduction ? '✅ YES' : '❌ NO'}`);
  
  return isProduction;
}

// 主函数
async function main() {
  try {
    const envCheck = checkEnvironmentVariables();
    const buildCheck = checkBuildFiles();
    const isProduction = generateReport();
    
    console.log('\n' + '='.repeat(50));
    
    if (isProduction && envCheck) {
      console.log('🎉 SUCCESS: Production configuration verified!');
      process.exit(0);
    } else {
      console.log('⚠️ WARNING: Configuration issues detected');
      console.log('\nRecommended actions:');
      console.log('1. Check environment variables');
      console.log('2. Rebuild the application: pnpm build');
      console.log('3. Verify GitHub Actions environment settings');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error during verification:', error.message);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = {
  checkEnvironmentVariables,
  checkBuildFiles,
  generateReport
}; 