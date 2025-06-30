import { useEffect, useRef } from 'react';
import authService from '../services/auth-service';
import trafficReporter from '../services/traffic-reporter';
import { createAuthSockette } from '../utils/websocket';
import { useClashInfo } from './use-clash';
import { useVisibility } from './use-visibility';

interface ITrafficItem {
  up: number;
  down: number;
}

/**
 * 独立的流量监控Hook - 专门用于流量上报
 * 不会影响现有的UI逻辑和流量显示组件
 */
export const useTrafficMonitor = () => {
  const { clashInfo } = useClashInfo();
  const pageVisible = useVisibility();
  
  // 流量累计统计 - 独立于UI组件
  const trafficDataRef = useRef({
    totalUploadBytes: 0,
    totalDownloadBytes: 0,
    lastUpdateTime: Date.now(),
    isInitialized: false,
  });

  // WebSocket引用
  const socketRef = useRef<ReturnType<typeof createAuthSockette> | null>(null);

  // 初始化流量监控
  useEffect(() => {
    // 只有在用户已认证时才启动流量监控
    if (!authService.isAuthenticated() || !clashInfo || !pageVisible) {
      return;
    }

    const { server = '', secret = '' } = clashInfo;
    if (!server) {
      console.warn('[TrafficMonitor] 服务器地址为空，无法建立连接');
      return;
    }

    console.log('[TrafficMonitor] 🚀 启动独立流量监控...');

    try {
      const socket = createAuthSockette(`${server}/traffic`, secret, {
        timeout: 8000,
        onmessage(event) {
          try {
            const data = JSON.parse(event.data) as ITrafficItem;
            handleTrafficData(data);
          } catch (error) {
            console.error('[TrafficMonitor] 解析流量数据失败:', error);
          }
        },
        onerror(event) {
          console.error('[TrafficMonitor] WebSocket连接错误:', event);
        },
        onclose(event) {
          console.log('[TrafficMonitor] WebSocket连接关闭');
        },
        onopen(event) {
          console.log('[TrafficMonitor] ✅ 流量监控WebSocket连接已建立');
        },
      });

      socketRef.current = socket;
      
      // 返回清理函数
      return () => {
        console.log('[TrafficMonitor] 🧹 清理流量监控连接');
        try {
          if (socketRef.current) {
            socketRef.current.close();
            socketRef.current = null;
          }
        } catch (e) {
          console.error('[TrafficMonitor] 关闭连接时出错:', e);
        }
      };

    } catch (error) {
      console.error('[TrafficMonitor] 创建连接失败:', error);
      return;
    }
  }, [clashInfo, pageVisible]);

  // 处理流量数据
  const handleTrafficData = (data: ITrafficItem) => {
    const currentTime = Date.now();
    const timeDiff = (currentTime - trafficDataRef.current.lastUpdateTime) / 1000; // 转换为秒

    // 防止异常的时间差值
    if (timeDiff <= 0 || timeDiff > 10) {
      trafficDataRef.current.lastUpdateTime = currentTime;
      return;
    }

    // 从速度计算流量增量（假设速度单位为bytes/s）
    const uploadIncrease = (data.up || 0) * timeDiff;
    const downloadIncrease = (data.down || 0) * timeDiff;

    // 累计流量
    trafficDataRef.current.totalUploadBytes += uploadIncrease;
    trafficDataRef.current.totalDownloadBytes += downloadIncrease;
    trafficDataRef.current.lastUpdateTime = currentTime;

    // 如果是首次初始化，标记为已初始化
    if (!trafficDataRef.current.isInitialized) {
      trafficDataRef.current.isInitialized = true;
      console.log('[TrafficMonitor] 📊 流量监控已初始化');
    }

    // 更新流量上报服务（静默运行，不影响UI）
    trafficReporter.updateTraffic(
      trafficDataRef.current.totalUploadBytes,
      trafficDataRef.current.totalDownloadBytes
    ).catch(error => {
      // 静默处理错误，不影响用户体验
      console.debug('[TrafficMonitor] 流量上报更新失败:', error);
    });
  };

  // 获取当前流量统计（可选，用于调试）
  const getTrafficStats = () => {
    return {
      totalUploadMB: (trafficDataRef.current.totalUploadBytes / (1024 * 1024)).toFixed(2),
      totalDownloadMB: (trafficDataRef.current.totalDownloadBytes / (1024 * 1024)).toFixed(2),
      isInitialized: trafficDataRef.current.isInitialized,
    };
  };

  // 重置流量统计（登录/注销时调用）
  const resetTrafficStats = () => {
    trafficDataRef.current = {
      totalUploadBytes: 0,
      totalDownloadBytes: 0,
      lastUpdateTime: Date.now(),
      isInitialized: false,
    };
    console.log('[TrafficMonitor] 🔄 流量统计已重置');
  };

  return {
    getTrafficStats,
    resetTrafficStats,
    isInitialized: trafficDataRef.current.isInitialized,
  };
}; 