#!/usr/bin/env node

/**
 * 网络连接诊断脚本
 * 用于调试生产环境登录时的网络错误
 */

import http from 'http';
import https from 'https';

console.log('🔍 YI0YI-加速器网络连接诊断\n');

// 测试目标
const targets = [
  {
    name: '开发环境API (localhost)',
    url: 'http://localhost:8080/api/auth/login',
    method: 'POST'
  },
  {
    name: '生产环境API (101proxy.top)',
    url: 'https://api.101proxy.top/api/auth/login',
    method: 'POST'
  },
  {
    name: '基础连接测试 (101proxy.top)',
    url: 'https://api.101proxy.top',
    method: 'GET'
  }
];

// 测试网络连接
const testConnection = (target) => {
  return new Promise((resolve) => {
    const url = new URL(target.url);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname,
      method: target.method,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Yi0Yi-Proxy-Diagnostics/1.0'
      }
    };

    console.log(`🔗 测试连接: ${target.name}`);
    console.log(`   URL: ${target.url}`);
    console.log(`   方法: ${target.method}`);
    
    const startTime = Date.now();
    
    const req = client.request(options, (res) => {
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log(`   ✅ 连接成功`);
      console.log(`   📊 状态码: ${res.statusCode}`);
      console.log(`   ⏱️  响应时间: ${duration}ms`);
      console.log(`   📄 响应头:`, Object.keys(res.headers).join(', '));
      
      // 读取响应数据
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (data.length < 500) {
          console.log(`   📝 响应内容: ${data}`);
        } else {
          console.log(`   📝 响应长度: ${data.length} bytes`);
        }
        
        resolve({
          success: true,
          status: res.statusCode,
          duration,
          data
        });
      });
    });

    req.on('error', (error) => {
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log(`   ❌ 连接失败`);
      console.log(`   🚫 错误类型: ${error.code || error.name}`);
      console.log(`   📝 错误信息: ${error.message}`);
      console.log(`   ⏱️  失败时间: ${duration}ms`);
      
      resolve({
        success: false,
        error: error.message,
        code: error.code,
        duration
      });
    });

    req.on('timeout', () => {
      req.destroy();
      console.log(`   ⏰ 连接超时 (10秒)`);
      
      resolve({
        success: false,
        error: 'Connection timeout',
        duration: 10000
      });
    });

    // 对于POST请求，发送测试数据
    if (target.method === 'POST') {
      const testData = JSON.stringify({
        email: 'test@example.com',
        password: 'test123',
        appId: 'BROWSER'
      });
      req.write(testData);
    }
    
    req.end();
  });
};

// DNS解析测试
const testDnsResolution = async () => {
  const dns = await import('dns');
  const { promisify } = await import('util');
  const lookup = promisify(dns.lookup);
  
  console.log('🌐 DNS解析测试:');
  
  const domains = ['api.101proxy.top', 'localhost'];
  
  for (const domain of domains) {
    try {
      const result = await lookup(domain);
      console.log(`   ✅ ${domain} → ${result.address} (${result.family === 4 ? 'IPv4' : 'IPv6'})`);
    } catch (error) {
      console.log(`   ❌ ${domain} → 解析失败: ${error.message}`);
    }
  }
  console.log('');
};

// 环境检测模拟
const simulateEnvironmentDetection = () => {
  console.log('🔍 环境检测模拟:');
  
  const scenarios = [
    {
      name: 'Tauri应用 (生产环境)',
      env: {
        DEV: false,
        MODE: 'production',
        hostname: 'tauri.localhost',
        port: ''
      }
    },
    {
      name: 'Web浏览器 (开发环境)',
      env: {
        DEV: true,
        MODE: 'development',
        hostname: 'localhost',
        port: '9097'
      }
    },
    {
      name: '构建后的Web应用',
      env: {
        DEV: false,
        MODE: 'production',
        hostname: 'example.com',
        port: '443'
      }
    }
  ];
  
  scenarios.forEach(scenario => {
    const isDevelopment = scenario.env.DEV || 
                          scenario.env.MODE === 'development' ||
                          scenario.env.hostname === 'localhost' ||
                          scenario.env.hostname === '127.0.0.1' ||
                          scenario.env.port === '9097';
    
    const apiUrl = isDevelopment ? 'http://localhost:8080' : 'https://api.101proxy.top';
    
    console.log(`   ${scenario.name}:`);
    console.log(`     环境: ${JSON.stringify(scenario.env)}`);
    console.log(`     检测结果: ${isDevelopment ? '开发环境' : '生产环境'}`);
    console.log(`     API URL: ${apiUrl}`);
    console.log('');
  });
};

// 主测试函数
const runDiagnostics = async () => {
  console.log('开始网络诊断...\n');
  
  // 1. 环境检测模拟
  simulateEnvironmentDetection();
  
  // 2. DNS解析测试
  await testDnsResolution();
  
  // 3. 网络连接测试
  console.log('🔗 网络连接测试:');
  const results = [];
  
  for (const target of targets) {
    const result = await testConnection(target);
    results.push({ target, result });
    console.log('');
  }
  
  // 4. 总结报告
  console.log('📊 诊断总结:');
  console.log('================');
  
  let hasConnectionIssues = false;
  
  results.forEach(({ target, result }) => {
    const status = result.success ? '✅ 正常' : '❌ 失败';
    console.log(`${target.name}: ${status}`);
    
    if (!result.success) {
      hasConnectionIssues = true;
      console.log(`  错误: ${result.error}`);
    } else if (result.status && result.status >= 400) {
      console.log(`  状态: HTTP ${result.status}`);
    }
  });
  
  console.log('');
  
  if (hasConnectionIssues) {
    console.log('🚨 发现连接问题，可能的解决方案:');
    console.log('1. 检查网络连接');
    console.log('2. 确认API服务器 api.101proxy.top 是否可访问');
    console.log('3. 检查防火墙设置');
    console.log('4. 尝试使用VPN或更换网络环境');
    console.log('5. 联系管理员确认API服务器状态');
  } else {
    console.log('🎉 网络连接正常！');
    console.log('如果仍有登录问题，可能是：');
    console.log('- 用户凭据错误');
    console.log('- API服务器端的问题');
    console.log('- 应用中的环境检测逻辑问题');
  }
  
  console.log('\n💡 调试建议:');
  console.log('1. 在应用中打开开发者工具');
  console.log('2. 查看控制台的环境检测信息');
  console.log('3. 检查Network标签中的API请求');
  console.log('4. 确认请求的URL是否正确');
};

runDiagnostics().catch(console.error); 