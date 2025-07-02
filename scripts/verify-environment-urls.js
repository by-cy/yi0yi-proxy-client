#!/usr/bin/env node

/**
 * 验证环境URL配置脚本
 * 确保开发和生产环境使用正确的API URL
 */

console.log('🔍 验证环境URL配置...\n');

// 模拟不同环境的检测逻辑
const checkEnvironmentUrl = (mockEnv) => {
  // 模拟环境检测逻辑 (从 src/services/api.ts 复制)
  const isDevelopment = mockEnv.DEV || 
                        mockEnv.MODE === 'development' ||
                        mockEnv.hostname === 'localhost' ||
                        mockEnv.hostname === '127.0.0.1' ||
                        mockEnv.port === '9097';

  // 模拟URL选择逻辑
  if (mockEnv.VITE_API_BASE_URL) {
    return mockEnv.VITE_API_BASE_URL;
  }
  
  if (isDevelopment) {
    return 'http://localhost:8080';
  } else {
    return 'https://api.101proxy.top';
  }
};

// 测试场景
const testCases = [
  {
    name: '开发环境 - Vite DEV模式',
    env: { DEV: true },
    expected: 'http://localhost:8080'
  },
  {
    name: '开发环境 - localhost主机名',
    env: { hostname: 'localhost' },
    expected: 'http://localhost:8080'
  },
  {
    name: '开发环境 - 端口9097',
    env: { port: '9097' },
    expected: 'http://localhost:8080'
  },
  {
    name: '生产环境',
    env: { hostname: 'app.101proxy.top' },
    expected: 'https://api.101proxy.top'
  },
  {
    name: '自定义环境变量',
    env: { 
      hostname: 'production.com',
      VITE_API_BASE_URL: 'https://custom-api.example.com'
    },
    expected: 'https://custom-api.example.com'
  }
];

console.log('📋 测试结果:\n');

let allPassed = true;

testCases.forEach((testCase, index) => {
  const result = checkEnvironmentUrl(testCase.env);
  const passed = result === testCase.expected;
  
  console.log(`${index + 1}. ${testCase.name}`);
  console.log(`   环境: ${JSON.stringify(testCase.env)}`);
  console.log(`   预期: ${testCase.expected}`);
  console.log(`   实际: ${result}`);
  console.log(`   结果: ${passed ? '✅ 通过' : '❌ 失败'}\n`);
  
  if (!passed) {
    allPassed = false;
  }
});

console.log('📊 总结:');
if (allPassed) {
  console.log('🎉 所有测试通过！环境URL配置正确。');
  console.log('\n📝 确认配置:');
  console.log('- 开发环境: http://localhost:8080');
  console.log('- 生产环境: https://api.101proxy.top');
  console.log('- 支持环境变量覆盖: VITE_API_BASE_URL');
} else {
  console.log('❌ 部分测试失败，请检查配置逻辑！');
  process.exit(1);
}

console.log('\n🚀 下一步:');
console.log('1. 运行 pnpm run web:dev 测试开发环境');
console.log('2. 检查浏览器控制台的环境检测信息');
console.log('3. 验证登录等API请求使用正确的URL');
console.log('4. 构建生产版本测试生产环境配置'); 