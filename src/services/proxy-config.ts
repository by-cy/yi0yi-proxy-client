// 代理配置服务
// 使用认证的 subscription API 获取节点信息

import { importProfile } from "@/services/cmds";
import { AUTH_API_CONFIG } from './api';
import authService from './auth-service';

export interface ProxyImportResult {
  success: boolean;
  message: string;
  url: string;
}

/**
 * 构建带JWT token的subscription URL
 */
const buildSubscriptionUrl = (): string => {
  const token = authService.getAccessToken();
  console.log('🔑 构建subscription URL...', {
    hasToken: !!token,
    tokenLength: token?.length || 0,
    tokenPreview: token ? `${token.substring(0, 20)}...` : 'N/A'
  });
  
  if (!token) {
    throw new Error('JWT token不可用，请重新登录');
  }
  
  // 检查token格式是否正确
  try {
    if (token.split('.').length !== 3) {
      throw new Error(`JWT token格式错误: ${token.substring(0, 50)}...`);
    }
    console.log('✅ JWT token格式验证通过');
  } catch (e) {
    console.error('❌ JWT token格式验证失败:', e);
    throw new Error('JWT token格式无效，请重新登录');
  }
  
  // 检查token是否过期
  try {
    const tokenPayload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Math.floor(Date.now() / 1000);
    console.log('🕐 Token时间信息:', {
      issued: tokenPayload.iat ? new Date(tokenPayload.iat * 1000).toISOString() : 'N/A',
      expires: tokenPayload.exp ? new Date(tokenPayload.exp * 1000).toISOString() : 'N/A',
      currentTime: new Date(currentTime * 1000).toISOString(),
      isExpired: tokenPayload.exp ? currentTime > tokenPayload.exp : 'unknown'
    });
    
    if (tokenPayload.exp && currentTime > tokenPayload.exp) {
      throw new Error('JWT token已过期，请重新登录');
    }
  } catch (e) {
    console.warn('⚠️ 无法解析token过期时间:', e);
  }
  
  const url = `${AUTH_API_CONFIG.baseURL}/api/subscription?token=${token}`;
  console.log('🔗 构建的URL:', `${AUTH_API_CONFIG.baseURL}/api/subscription?token=[TOKEN]`);
  console.log('🌐 API Base URL:', AUTH_API_CONFIG.baseURL);
  
  return url;
};

/**
 * 导入代理节点配置
 * 使用认证的 subscription API
 */
export const importProxyNodes = async (): Promise<ProxyImportResult> => {
  try {
    // 检查认证状态
    if (!authService.isAuthenticated()) {
      throw new Error('用户未认证，请重新登录');
    }

    // 检查token有效性
    const token = authService.getAccessToken();
    if (!token) {
      throw new Error('JWT token不可用，请重新登录');
    }

    const subscriptionUrl = buildSubscriptionUrl();
    
    console.log('📡 正在从subscription API导入节点配置...');
    console.log('🔗 API端点: /api/subscription');
    console.log('🏢 API服务器:', AUTH_API_CONFIG.baseURL);
    console.log('📋 认证状态检查:', {
      isAuthenticated: authService.isAuthenticated(),
      hasToken: !!token,
      tokenLength: token.length
    });
    
    // 使用现有的 importProfile 功能
    console.log('🚀 开始调用 importProfile...');
    try {
      await importProfile(subscriptionUrl, { 
      with_proxy: true 
    });
      console.log('✅ importProfile 调用成功');
    } catch (profileError: any) {
      console.error('❌ importProfile 调用失败:', profileError);
      
      // 分析错误类型
      let errorDetails = '';
      if (profileError.message) {
        errorDetails = profileError.message;
        
        // 特别处理403错误
        if (errorDetails.includes('403') || errorDetails.includes('Forbidden')) {
          console.error('🚫 403 Forbidden 错误分析:');
          console.error('  - Token可能已过期或无效');
          console.error('  - API端点可能不正确');
          console.error('  - 服务器可能不识别这个token');
          console.error('  - 用户可能没有subscription访问权限');
          
          throw new Error(`访问被拒绝 (403): JWT token可能已过期或无效，或者您没有订阅访问权限。请重新登录后重试。原始错误: ${errorDetails}`);
        }
        
        // 处理其他HTTP错误
        if (errorDetails.includes('401')) {
          throw new Error(`认证失败 (401): ${errorDetails}`);
        }
        
        if (errorDetails.includes('404')) {
          throw new Error(`API端点不存在 (404): 请检查服务器配置。${errorDetails}`);
        }
        
        if (errorDetails.includes('500')) {
          throw new Error(`服务器内部错误 (500): ${errorDetails}`);
        }
      }
      
      // 重新抛出原始错误
      throw profileError;
    }
    
    console.log('✅ 成功从subscription API导入节点配置');
    
    return {
      success: true,
      message: '成功从subscription API导入节点配置',
      url: subscriptionUrl
    };
    
  } catch (error) {
    console.error('❌ 导入节点配置失败:', error);
    
    let errorMessage = '未知错误';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else if (error && typeof error === 'object' && 'toString' in error) {
      errorMessage = error.toString();
    }
    
    console.error('❌ 详细错误信息:', errorMessage);
    
    // 处理特定错误
    if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
      return {
        success: false,
        message: `访问被拒绝 (403): JWT token可能已过期或无效，请重新登录`,
        url: ''
      };
    }
    
    if (errorMessage.includes('401') || errorMessage.includes('unauthorized') || errorMessage.includes('JWT token不可用')) {
      return {
        success: false,
        message: `认证失败 (401): ${errorMessage}`,
        url: ''
      };
    }
    
    return {
      success: false,
      message: `导入节点配置失败: ${errorMessage}`,
      url: ''
    };
  }
};

/**
 * 更新代理配置的完整流程
 * 包括导入配置和错误处理
 */
export const updateProxyConfiguration = async (): Promise<ProxyImportResult> => {
  try {
    console.log('🚀 开始更新代理配置...');
    
    const result = await importProxyNodes();
    
    if (result.success) {
      console.log('🎉 代理配置更新完成！');
    } else {
      console.error('❌ 代理配置更新失败:', result.message);
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ 更新代理配置失败:', error);
    
    return {
      success: false,
      message: `更新代理配置失败: ${error instanceof Error ? error.message : '未知错误'}`,
      url: ''
    };
  }
}; 