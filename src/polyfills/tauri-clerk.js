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
  
  console.log('✅ Tauri Clerk polyfills applied successfully');
}

// 导出检测函数供其他模块使用
export { isTauriEnvironment };
