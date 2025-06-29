/**
 * Tauri 错误处理器
 * 专门处理 Tauri 环境中的 Clerk 相关错误
 */

// 检测 Tauri 环境
const isTauriEnvironment = () => {
  return window?.location?.protocol === 'tauri:' || 
         (window as any)?.__TAURI__ !== undefined ||
         window?.navigator?.userAgent?.includes('Tauri');
};

// 已知的 Tauri Clerk 错误模式
const TAURI_CLERK_ERROR_PATTERNS = [
  'this.close is not a function',
  'window.close is undefined',
  'close is not defined',
  'Cannot read properties of undefined (reading \'close\')',
  'popup.close is not a function'
];

// 检查是否是 Tauri Clerk 错误
export const isTauriClerkError = (error: Error | string): boolean => {
  const errorMessage = typeof error === 'string' ? error : error.message;
  
  return isTauriEnvironment() && 
         TAURI_CLERK_ERROR_PATTERNS.some(pattern => 
           errorMessage.toLowerCase().includes(pattern.toLowerCase())
         );
};

// 处理 Tauri Clerk 错误
export const handleTauriClerkError = (error: Error | string, context?: string): void => {
  const errorMessage = typeof error === 'string' ? error : error.message;
  
  if (isTauriClerkError(error)) {
    console.warn(`🚀 Tauri Clerk Error Handled${context ? ` (${context})` : ''}:`, errorMessage);
    console.log('💡 This error is expected in Tauri environment and has been handled gracefully');
    
    // 触发自定义事件通知应用
    const event = new CustomEvent('tauri-clerk-error-handled', {
      detail: { 
        error: errorMessage, 
        context,
        timestamp: new Date().toISOString()
      }
    });
    window.dispatchEvent(event);
    
    return; // 不重新抛出错误
  }
  
  // 如果不是 Tauri Clerk 错误，重新抛出
  if (typeof error !== 'string') {
    throw error;
  } else {
    throw new Error(error);
  }
};

// 设置全局错误处理器
export const setupTauriErrorHandler = () => {
  if (!isTauriEnvironment()) {
    console.log('🔍 Not in Tauri environment, skipping Tauri error handler setup');
    return;
  }
  
  console.log('🚀 Setting up Tauri error handler...');
  
  // 处理未捕获的错误
  const originalErrorHandler = window.onerror;
  window.onerror = function(message, source, lineno, colno, error) {
    try {
      if (typeof message === 'string' && isTauriClerkError(message)) {
        handleTauriClerkError(message, 'Global Error Handler');
        return true; // 阻止默认错误处理
      }
      
      if (error && isTauriClerkError(error)) {
        handleTauriClerkError(error, 'Global Error Handler');
        return true; // 阻止默认错误处理
      }
    } catch (handlingError) {
      console.warn('Error in Tauri error handler:', handlingError);
    }
    
    // 调用原始错误处理器
    if (originalErrorHandler) {
      return originalErrorHandler.call(this, message, source, lineno, colno, error);
    }
    
    return false;
  };
  
  // 处理未捕获的 Promise 拒绝
  const originalUnhandledRejection = window.onunhandledrejection;
  window.onunhandledrejection = function(event) {
    try {
      const error = event.reason;
      if (error && isTauriClerkError(error)) {
        handleTauriClerkError(error, 'Unhandled Promise Rejection');
        event.preventDefault(); // 阻止默认处理
        return;
      }
    } catch (handlingError) {
      console.warn('Error in Tauri promise rejection handler:', handlingError);
    }
    
    // 调用原始处理器
    if (originalUnhandledRejection) {
      return originalUnhandledRejection.call(this, event);
    }
  };
  
  // 监听自定义错误事件
  window.addEventListener('tauri-clerk-error-handled', (event: CustomEvent) => {
    console.log('🎯 Tauri Clerk error was handled:', event.detail);
  });
  
  console.log('✅ Tauri error handler setup completed');
};

// 手动处理错误的工具函数
export const wrapTauriClerkFunction = <T extends (...args: any[]) => any>(
  fn: T,
  context?: string
): T => {
  return ((...args: any[]) => {
    try {
      const result = fn(...args);
      
      // 如果返回 Promise，添加错误处理
      if (result && typeof result.then === 'function') {
        return result.catch((error: Error) => {
          if (isTauriClerkError(error)) {
            handleTauriClerkError(error, context);
            return null; // 或其他默认值
          }
          throw error;
        });
      }
      
      return result;
    } catch (error) {
      if (error instanceof Error && isTauriClerkError(error)) {
        handleTauriClerkError(error, context);
        return null; // 或其他默认值
      }
      throw error;
    }
  }) as T;
}; 