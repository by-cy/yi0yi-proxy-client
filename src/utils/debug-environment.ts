/**
 * 浏览器内环境调试工具
 * 可以在应用控制台中直接运行
 */

import { AUTH_API_CONFIG, ENVIRONMENT } from '../services/api';
import authService from '../services/auth-service';

interface DebugResult {
  environment: any;
  apiConfig: any;
  authState: any;
  networkTest: any;
}

/**
 * 环境信息调试
 */
export const debugEnvironment = async (): Promise<DebugResult> => {
  console.log('🔍 开始环境调试...\n');
  
  // 1. 环境检测信息
  const environmentInfo = {
    ...ENVIRONMENT,
    location: {
      hostname: window.location.hostname,
      port: window.location.port,
      protocol: window.location.protocol,
      href: window.location.href
    },
    viteMeta: {
      MODE: import.meta.env.MODE,
      DEV: import.meta.env.DEV,
      PROD: import.meta.env.PROD,
      VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL
    },
    tauri: {
      available: typeof window !== 'undefined' && !!(window as any).__TAURI__,
      userAgent: navigator.userAgent
    }
  };
  
  console.log('🌍 环境信息:', environmentInfo);
  
  // 2. API配置信息
  const apiConfig = {
    baseURL: AUTH_API_CONFIG.baseURL,
    timeout: AUTH_API_CONFIG.timeout,
    endpoints: AUTH_API_CONFIG.endpoints
  };
  
  console.log('🔗 API配置:', apiConfig);
  
  // 3. 认证状态
  const authState = {
    isAuthenticated: authService.isAuthenticated(),
    hasAccessToken: !!authService.getAccessToken(),
    currentUser: authService.getCurrentUser(),
    appId: authService.getDetectedAppId()
  };
  
  console.log('🔐 认证状态:', authState);
  
  // 4. 网络连接测试
  console.log('🔗 测试API连接...');
  const networkTest = await testApiConnection();
  console.log('📡 网络测试结果:', networkTest);
  
  const result = {
    environment: environmentInfo,
    apiConfig,
    authState,
    networkTest
  };
  
  console.log('\n📋 完整调试信息:', result);
  
  return result;
};

/**
 * 测试API连接
 */
const testApiConnection = async () => {
  const tests = [
    {
      name: '基础连接测试',
      url: AUTH_API_CONFIG.baseURL,
      method: 'GET'
    },
    {
      name: '登录端点测试',
      url: `${AUTH_API_CONFIG.baseURL}${AUTH_API_CONFIG.endpoints.login}`,
      method: 'POST'
    }
  ];
  
  const results = [];
  
  for (const test of tests) {
    try {
      console.log(`   🔗 测试: ${test.name}`);
      console.log(`   📍 URL: ${test.url}`);
      
      const startTime = Date.now();
      
      const response = await fetch(test.url, {
        method: test.method,
        headers: {
          'Content-Type': 'application/json'
        },
        // 对于POST请求发送测试数据
        body: test.method === 'POST' ? JSON.stringify({
          email: 'test@example.com',
          password: 'test123',
          appId: 'BROWSER'
        }) : undefined
      });
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      const testResult = {
        name: test.name,
        url: test.url,
        success: true,
        status: response.status,
        statusText: response.statusText,
        duration,
        headers: Object.fromEntries(response.headers.entries())
      };
      
      console.log(`   ✅ 成功 - 状态: ${response.status}, 耗时: ${duration}ms`);
      results.push(testResult);
      
    } catch (error: any) {
      const testResult = {
        name: test.name,
        url: test.url,
        success: false,
        error: error.message,
        type: error.name,
        duration: 0
      };
      
      console.log(`   ❌ 失败 - 错误: ${error.message}`);
      results.push(testResult);
    }
  }
  
  return results;
};

/**
 * 快速API状态检查
 */
export const quickApiCheck = async (): Promise<boolean> => {
  try {
    const response = await fetch(AUTH_API_CONFIG.baseURL, {
      method: 'GET',
      timeout: 5000
    } as any);
    
    const isOk = response.status < 500;
    console.log(`🚀 API快速检查: ${isOk ? '✅ 可用' : '❌ 不可用'} (状态: ${response.status})`);
    return isOk;
  } catch (error) {
    console.log(`🚀 API快速检查: ❌ 连接失败 - ${error}`);
    return false;
  }
};

/**
 * 修复环境配置建议
 */
export const getEnvironmentFixSuggestions = () => {
  const suggestions = [];
  
  if (!ENVIRONMENT.isProduction && !ENVIRONMENT.isDevelopment) {
    suggestions.push('❓ 环境检测异常，请检查Vite配置');
  }
  
  if (ENVIRONMENT.isTauriApp && ENVIRONMENT.isDevelopment) {
    suggestions.push('⚠️ Tauri应用被检测为开发环境，请确认构建配置');
  }
  
  if (!AUTH_API_CONFIG.baseURL.startsWith('https://') && ENVIRONMENT.isProduction) {
    suggestions.push('🔒 生产环境建议使用HTTPS');
  }
  
  if (AUTH_API_CONFIG.baseURL.includes('localhost') && ENVIRONMENT.isProduction) {
    suggestions.push('🌐 生产环境不应使用localhost');
  }
  
  console.log('💡 环境配置建议:');
  if (suggestions.length === 0) {
    console.log('   ✅ 当前配置看起来正常');
  } else {
    suggestions.forEach(suggestion => console.log(`   ${suggestion}`));
  }
  
  return suggestions;
};

// 全局调试函数，可在控制台直接调用
(window as any).debugYi0YiEnvironment = debugEnvironment;
(window as any).quickApiCheck = quickApiCheck;
(window as any).getEnvironmentFixSuggestions = getEnvironmentFixSuggestions;

console.log('🛠️ 调试工具已加载! 在控制台中可以使用:');
console.log('  - debugYi0YiEnvironment() - 完整环境调试');
console.log('  - quickApiCheck() - 快速API检查');
console.log('  - getEnvironmentFixSuggestions() - 获取修复建议'); 