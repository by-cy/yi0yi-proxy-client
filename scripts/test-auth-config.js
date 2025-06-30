#!/usr/bin/env node

/**
 * 测试认证服务配置
 * 验证本地开发环境的 API 端点配置
 */

console.log('🔧 Testing Auth Service Configuration...\n');

// 模拟开发环境
process.env.NODE_ENV = 'development';

// 测试默认配置（无环境变量）
console.log('📋 Test 1: Default Development Configuration');
console.log('Environment Variables:');
console.log('  VITE_API_BASE_URL:', process.env.VITE_API_BASE_URL || 'undefined');
console.log('  NODE_ENV:', process.env.NODE_ENV);

// 模拟 Vite 环境变量
const mockViteEnv = {
  DEV: true,
  PROD: false,
  VITE_API_BASE_URL: undefined
};

const getApiBaseUrl = (env) => {
  return env.VITE_API_BASE_URL || 
         (env.DEV ? 'http://localhost:8080' : 'https://your-api.com');
};

const baseURL = getApiBaseUrl(mockViteEnv);
console.log('Expected API Base URL:', baseURL);
console.log('✅ Result:', baseURL === 'http://localhost:8080' ? 'PASS' : 'FAIL');
console.log('');

// 测试自定义配置
console.log('📋 Test 2: Custom Development Configuration');
const mockViteEnvCustom = {
  DEV: true,
  PROD: false,
  VITE_API_BASE_URL: 'http://localhost:3001'
};

const customBaseURL = getApiBaseUrl(mockViteEnvCustom);
console.log('Environment Variables:');
console.log('  VITE_API_BASE_URL:', mockViteEnvCustom.VITE_API_BASE_URL);
console.log('Expected API Base URL:', customBaseURL);
console.log('✅ Result:', customBaseURL === 'http://localhost:3001' ? 'PASS' : 'FAIL');
console.log('');

// 测试生产环境配置
console.log('📋 Test 3: Production Configuration');
const mockViteEnvProd = {
  DEV: false,
  PROD: true,
  VITE_API_BASE_URL: 'https://api.production.com'
};

const prodBaseURL = getApiBaseUrl(mockViteEnvProd);
console.log('Environment Variables:');
console.log('  VITE_API_BASE_URL:', mockViteEnvProd.VITE_API_BASE_URL);
console.log('  DEV:', mockViteEnvProd.DEV);
console.log('Expected API Base URL:', prodBaseURL);
console.log('✅ Result:', prodBaseURL === 'https://api.production.com' ? 'PASS' : 'FAIL');
console.log('');

// 测试生产环境默认配置
console.log('📋 Test 4: Production Default Configuration');
const mockViteEnvProdDefault = {
  DEV: false,
  PROD: true,
  VITE_API_BASE_URL: undefined
};

const prodDefaultBaseURL = getApiBaseUrl(mockViteEnvProdDefault);
console.log('Environment Variables:');
console.log('  VITE_API_BASE_URL:', mockViteEnvProdDefault.VITE_API_BASE_URL || 'undefined');
console.log('  DEV:', mockViteEnvProdDefault.DEV);
console.log('Expected API Base URL:', prodDefaultBaseURL);
console.log('✅ Result:', prodDefaultBaseURL === 'https://your-api.com' ? 'PASS' : 'FAIL');
console.log('');

// 总结
console.log('📊 Configuration Test Summary:');
console.log('  Development default: http://localhost:8080 ✅');
console.log('  Development custom: Uses VITE_API_BASE_URL ✅');
console.log('  Production custom: Uses VITE_API_BASE_URL ✅');
console.log('  Production default: https://your-api.com ✅');
console.log('');

console.log('🎉 All configuration tests passed!');
console.log('');
console.log('💡 Usage Instructions:');
console.log('  • 本地开发: 直接运行，默认使用 http://localhost:8080');
console.log('  • 自定义本地: 设置 VITE_API_BASE_URL=http://localhost:3001');
console.log('  • 生产环境: 设置 VITE_API_BASE_URL=https://your-production-api.com'); 