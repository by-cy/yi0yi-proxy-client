/**
 * Tauri Clerk Polyfill
 * 为 Tauri 环境中的 Clerk 提供必要的 polyfill
 */

// 检测是否在 Tauri 环境中
const isTauriEnvironment = () => {
  return window?.location?.protocol === 'tauri:' || 
         window?.__TAURI__ !== undefined ||
         window?.navigator?.userAgent?.includes('Tauri');
};

// Tauri 环境的 window.close polyfill
if (isTauriEnvironment()) {
  console.log('🚀 Tauri environment detected, applying Clerk polyfills...');
  
  // 保存原始的 window.close (如果存在)
  const originalClose = window.close;
  
  // 重写 window.close 方法
  window.close = function(returnValue) {
    console.log('🔄 Tauri Polyfill: window.close() called, handling gracefully');
    
    try {
      // 尝试调用原始的 close 方法
      if (typeof originalClose === 'function') {
        originalClose.call(this, returnValue);
        return;
      }
      
      // 如果没有原始方法，模拟关闭行为
      console.log('🎯 Simulating window close in Tauri environment');
      
      // 在 Tauri 中，我们可能想要隐藏窗口或发送事件
      if (window.__TAURI__?.window) {
        // 尝试使用 Tauri API 隐藏窗口
        window.__TAURI__.window.getCurrentWindow().then(currentWindow => {
          currentWindow.hide().catch(console.warn);
        }).catch(() => {
          console.log('⚠️ Tauri window API not available, using fallback');
        });
      }
      
      // 触发自定义事件以通知应用窗口"关闭"
      const closeEvent = new CustomEvent('tauri-window-close', {
        detail: { returnValue }
      });
      window.dispatchEvent(closeEvent);
      
    } catch (error) {
      console.warn('⚠️ Error in window.close polyfill:', error);
      // 静默处理错误，不让它传播到 Clerk
    }
  };
  
  // 为 Clerk OAuth 弹出窗口添加特殊处理
  const originalOpen = window.open;
  window.open = function(...args) {
    console.log('🔄 Tauri Polyfill: window.open() called');
    
    try {
      const popup = originalOpen?.apply(this, args);
      
      // 如果成功创建了弹出窗口，为其添加 close polyfill
      if (popup && typeof popup === 'object') {
        const originalPopupClose = popup.close;
        popup.close = function() {
          console.log('🔄 Tauri Polyfill: popup.close() called');
          try {
            if (typeof originalPopupClose === 'function') {
              originalPopupClose.call(this);
            } else {
              // 模拟关闭弹出窗口
              console.log('🎯 Simulating popup close in Tauri environment');
            }
          } catch (error) {
            console.warn('⚠️ Error closing popup:', error);
          }
        };
      }
      
      return popup;
    } catch (error) {
      console.warn('⚠️ Error in window.open polyfill:', error);
      return null;
    }
  };
  
  // 添加 postMessage polyfill 处理跨窗口通信
  const originalPostMessage = window.postMessage;
  window.postMessage = function(message, targetOrigin, transfer) {
    console.log('🔄 Tauri Polyfill: postMessage called', { message, targetOrigin });
    
    try {
      if (originalPostMessage) {
        return originalPostMessage.call(this, message, targetOrigin, transfer);
      } else {
        // 在 Tauri 中模拟 postMessage
        setTimeout(() => {
          const event = new MessageEvent('message', {
            data: message,
            origin: targetOrigin || window.location.origin,
            source: window
          });
          window.dispatchEvent(event);
        }, 0);
      }
    } catch (error) {
      console.warn('⚠️ Error in postMessage polyfill:', error);
    }
  };
  
  // 添加更强力的全局错误处理器来捕获所有 close 相关错误
  const originalErrorHandler = window.onerror;
  window.onerror = function (message, source, lineno, colno, error) {
    // 检查是否是任何形式的 close 方法错误
    const messageStr = typeof message === 'string' ? message : String(message || '');
    const closeErrorPatterns = [
      'close is not a function',
      'this.close is not a function', 
      '.close is not a function',
      'close is undefined',
      'this.close is undefined',
      '.close is undefined',
      'Cannot read properties of undefined (reading \'close\')',
      'Cannot read property \'close\' of undefined',
      'popup.close is not a function'
    ];
    
    const isCloseError = closeErrorPatterns.some(pattern => 
      messageStr.toLowerCase().includes(pattern.toLowerCase())
    );
    
    if (isCloseError) {
      console.log('🔄 Tauri Polyfill: Caught and handled close error:', messageStr);
      console.log('📍 Error source:', source);
      return true; // 阻止错误传播
    }
    
    // 调用原始错误处理器
    if (originalErrorHandler) {
      return originalErrorHandler.call(this, message, source, lineno, colno, error);
    }
    
    return false;
  };
  
  // 处理未捕获的异常
  const originalUnhandledRejection = window.onunhandledrejection;
  window.onunhandledrejection = function (event) {
    const errorMsg = event.reason?.message || String(event.reason || '');
    const closeErrorPatterns = [
      'close is not a function',
      'this.close is not a function',
      '.close is not a function', 
      'close is undefined',
      'this.close is undefined',
      '.close is undefined',
      'Cannot read properties of undefined (reading \'close\')',
      'Cannot read property \'close\' of undefined',
      'popup.close is not a function'
    ];
    
    const isCloseError = closeErrorPatterns.some(pattern => 
      errorMsg.toLowerCase().includes(pattern.toLowerCase())
    );
    
    if (isCloseError) {
      console.log('🔄 Tauri Polyfill: Caught and handled close promise rejection:', errorMsg);
      event.preventDefault();
      return;
    }
    
    if (originalUnhandledRejection) {
      return originalUnhandledRejection.call(this, event);
    }
  };
  
  // 添加 addEventListener 拦截来捕获更多错误事件
  const originalAddEventListener = window.addEventListener;
  window.addEventListener = function(type, listener, options) {
    if (type === 'error') {
      const wrappedListener = function(event) {
        const errorMsg = event.error?.message || event.message || String(event.error || '');
        const closeErrorPatterns = [
          'close is not a function',
          'this.close is not a function',
          '.close is not a function'
        ];
        
        const isCloseError = closeErrorPatterns.some(pattern => 
          errorMsg.toLowerCase().includes(pattern.toLowerCase())
        );
        
        if (isCloseError) {
          console.log('🔄 Tauri Polyfill: Intercepted close error via addEventListener:', errorMsg);
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        
        if (typeof listener === 'function') {
          return listener.call(this, event);
        }
      };
      
      return originalAddEventListener.call(this, type, wrappedListener, options);
    }
    
    return originalAddEventListener.call(this, type, listener, options);
  };
  
  // 添加终极保护：确保全局 close 方法存在
  if (typeof window.close !== 'function') {
    window.close = function(returnValue) {
      console.log('🔄 Tauri Polyfill: Global fallback close() called');
      return;
    };
  }
  
  // 创建一个通用的 close 方法，可以附加到任何对象
  const universalClose = function() {
    console.log('🔄 Tauri Polyfill: Universal close() called on', this);
    return;
  };
  
  // 定期检查并修复可能缺失的 close 方法
  const closeMethodChecker = setInterval(() => {
    try {
      // 检查 window 对象
      if (typeof window.close !== 'function') {
        window.close = universalClose;
        console.log('🔄 Tauri Polyfill: Restored window.close method');
      }
      
      // 检查 document 对象（有时 Clerk 可能在这里调用 close）
      if (typeof document.close !== 'function') {
        document.close = universalClose;
      }
      
      // 检查全局对象上是否有其他可能的 close 调用
      if (typeof globalThis.close !== 'function') {
        globalThis.close = universalClose;
      }
      
    } catch (error) {
      // 静默处理检查过程中的任何错误
      console.warn('🔄 Tauri Polyfill: Error in close method checker:', error);
    }
  }, 100);
  
  // 5秒后停止检查器，避免无限运行
  setTimeout(() => {
    clearInterval(closeMethodChecker);
    console.log('🔄 Tauri Polyfill: Close method checker stopped');
  }, 5000);
  
  console.log('✅ Tauri Clerk polyfills applied successfully with enhanced protection');
}

// 导出检测函数供其他模块使用
export { isTauriEnvironment };
