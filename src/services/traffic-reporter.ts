import { AUTH_API_CONFIG } from './api';
import authService from './auth-service';

interface TrafficReportRequest {
  email: string;
  sessionId: string;
  uploadedMb: number;
  downloadedMb: number;
  timestamp?: string;
}

interface TrafficReportResponse {
  status: 'ok' | 'over_quota' | 'error';
  used: number;
  limit: number;
  message: string | null;
}

interface TrafficStats {
  uploadBytes: number;
  downloadBytes: number;
  lastReportTime: number;
}

class TrafficReporter {
  private reportThresholdMB = 0; // 测试模式：设置为0直接上报，生产环境可改为500
  private lastReportedTraffic: TrafficStats = {
    uploadBytes: 0,
    downloadBytes: 0,
    lastReportTime: Date.now()
  };
  private sessionId: string;
  private isEnabled = true;
  private testMode = true; // 测试模式标志

  constructor() {
    // 生成设备会话ID
    this.sessionId = this.generateSessionId();
    
    // 从localStorage恢复上次的上报记录
    this.restoreLastReportData();
    
    console.log('🚀 TrafficReporter initialized', {
      sessionId: this.sessionId,
      thresholdMB: this.reportThresholdMB,
      testMode: this.testMode
    });
  }

  /**
   * 生成设备会话ID
   */
  private generateSessionId(): string {
    const appId = authService.getDetectedAppId();
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${appId}-${timestamp}-${random}`;
  }

  /**
   * 字节转换为MB
   */
  private bytesToMB(bytes: number): number {
    return parseFloat((bytes / (1024 * 1024)).toFixed(2));
  }

  /**
   * 从localStorage恢复上次上报数据
   */
  private restoreLastReportData(): void {
    try {
      const saved = localStorage.getItem('traffic_report_state');
      if (saved) {
        const data = JSON.parse(saved);
        this.lastReportedTraffic = {
          uploadBytes: data.uploadBytes || 0,
          downloadBytes: data.downloadBytes || 0,
          lastReportTime: data.lastReportTime || Date.now()
        };
        console.log('📊 恢复流量上报状态:', this.lastReportedTraffic);
      }
    } catch (error) {
      console.warn('⚠️ 恢复流量状态失败:', error);
    }
  }

  /**
   * 保存当前上报状态
   */
  private saveReportState(): void {
    try {
      localStorage.setItem('traffic_report_state', JSON.stringify(this.lastReportedTraffic));
    } catch (error) {
      console.warn('⚠️ 保存流量状态失败:', error);
    }
  }

  /**
   * 更新流量统计并检查是否需要上报
   */
  async updateTraffic(uploadBytes: number, downloadBytes: number): Promise<void> {
    if (!this.isEnabled) {
      console.log('📊 流量上报已禁用，跳过更新');
      return;
    }
    
    const isAuthenticated = authService.isAuthenticated();
    const user = authService.getCurrentUser();
    
    if (!isAuthenticated || !user?.email) {
      console.warn('⚠️ 用户未认证或邮箱不可用，跳过流量上报', {
        isAuthenticated,
        hasUser: !!user,
        hasEmail: !!user?.email
      });
      return;
    }

    try {
      // 计算增量流量
      const uploadDelta = Math.max(0, uploadBytes - this.lastReportedTraffic.uploadBytes);
      const downloadDelta = Math.max(0, downloadBytes - this.lastReportedTraffic.downloadBytes);
      
      // 转换为MB
      const uploadDeltaMB = this.bytesToMB(uploadDelta);
      const downloadDeltaMB = this.bytesToMB(downloadDelta);
      const totalDeltaMB = uploadDeltaMB + downloadDeltaMB;

      console.log('📊 流量更新:', {
        uploadDeltaMB: uploadDeltaMB.toFixed(2),
        downloadDeltaMB: downloadDeltaMB.toFixed(2),
        totalDeltaMB: totalDeltaMB.toFixed(2),
        thresholdMB: this.reportThresholdMB
      });

      // 检查是否达到上报阈值（测试模式下直接上报）
      if (this.testMode || totalDeltaMB >= this.reportThresholdMB) {
        if (this.testMode && totalDeltaMB > 0) {
          console.log(`🧪 测试模式：检测到流量变化 ${totalDeltaMB.toFixed(2)}MB，直接上报...`);
        } else if (totalDeltaMB >= this.reportThresholdMB) {
          console.log(`🚨 流量达到上报阈值 ${this.reportThresholdMB}MB，开始上报...`);
        }
        
        // 只有在有流量变化时才上报
        if (totalDeltaMB > 0) {
          await this.reportTraffic(uploadDeltaMB, downloadDeltaMB);
          
          // 更新已上报的流量基准
          this.lastReportedTraffic = {
            uploadBytes: uploadBytes,
            downloadBytes: downloadBytes,
            lastReportTime: Date.now()
          };
          
          this.saveReportState();
        }
      }
    } catch (error) {
      console.error('❌ 流量更新失败:', error);
    }
  }

  /**
   * 手动上报流量
   */
  async manualReport(uploadMB: number, downloadMB: number): Promise<TrafficReportResponse> {
    console.log('📤 手动上报流量:', { uploadMB, downloadMB });
    return this.reportTraffic(uploadMB, downloadMB);
  }

  /**
   * 上报流量到服务器
   */
  private async reportTraffic(uploadMB: number, downloadMB: number): Promise<TrafficReportResponse> {
    try {
      // 首先检查认证状态
      const isAuthenticated = authService.isAuthenticated();
      console.log('🔐 认证状态检查:', { isAuthenticated });
      
      if (!isAuthenticated) {
        throw new Error('用户未认证，无法上报流量');
      }
      
      const user = authService.getCurrentUser();
      console.log('👤 当前用户信息:', { 
        hasUser: !!user, 
        hasEmail: !!user?.email,
        email: user?.email ? user.email.substring(0, 3) + '***' : 'N/A' 
      });
      
      if (!user?.email) {
        throw new Error(`用户邮箱不可用 - user: ${!!user}, email: ${!!user?.email}`);
      }

      const requestData: TrafficReportRequest = {
        email: user.email,
        sessionId: this.sessionId,
        uploadedMb: parseFloat(uploadMB.toFixed(2)),
        downloadedMb: parseFloat(downloadMB.toFixed(2)),
        timestamp: new Date().toISOString()
      };

      console.log('📤 上报流量数据:', requestData);

      const response = await authService.makeAuthenticatedRequest(
        `${AUTH_API_CONFIG.baseURL}/api/v1/traffic/report`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestData)
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      const data: TrafficReportResponse = await response.json();
      
      console.log('✅ 流量上报成功:', data);
      
      // 处理配额状态
      this.handleQuotaStatus(data);
      
      return data;
      
    } catch (error: any) {
      console.error('❌ 流量上报失败:', error);
      
      // 处理特定错误
      if (error.message?.includes('401') || error.message?.includes('unauthorized')) {
        console.warn('🔐 认证失败，可能需要重新登录');
      } else if (error.message?.includes('429')) {
        console.warn('🚫 配额已超限');
      }
      
      throw error;
    }
  }

  /**
   * 处理配额状态
   */
  private handleQuotaStatus(response: TrafficReportResponse): void {
    switch (response.status) {
      case 'ok':
        if (response.used && response.limit) {
          const usagePercent = (response.used / response.limit * 100);
          console.log(`📊 配额使用率: ${usagePercent.toFixed(1)}%`);
          
          if (usagePercent > 90) {
            console.warn('⚠️ 配额即将用完，请注意！');
            this.notifyQuotaWarning(response.used, response.limit, usagePercent);
          }
        }
        break;
        
      case 'over_quota':
        console.error('🚫 配额已超限:', response);
        this.notifyQuotaExceeded(response.used, response.limit);
        break;
        
      case 'error':
        console.error('❌ 服务器返回错误:', response.message);
        break;
    }
  }

  /**
   * 通知配额警告
   */
  private notifyQuotaWarning(used: number, limit: number, percent: number): void {
    // 这里可以集成到应用的通知系统
    const message = `流量配额即将用完！已使用 ${used.toFixed(2)}MB / ${limit.toFixed(2)}MB (${percent.toFixed(1)}%)`;
    console.warn('⚠️ 配额警告:', message);
    
    // TODO: 显示用户通知
    // Notice.warning(message, 5000);
  }

  /**
   * 通知配额超限
   */
  private notifyQuotaExceeded(used: number, limit: number): void {
    const message = `流量配额已超限！已使用 ${used.toFixed(2)}MB，配额 ${limit.toFixed(2)}MB`;
    console.error('🚫 配额超限:', message);
    
    // TODO: 显示用户通知并可能禁用代理
    // Notice.error(message, 10000);
  }

  /**
   * 启用/禁用流量上报
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    console.log(`🔧 流量上报 ${enabled ? '启用' : '禁用'}`);
  }

  /**
   * 获取当前配置
   */
  getConfig(): { sessionId: string; thresholdMB: number; enabled: boolean; testMode: boolean } {
    return {
      sessionId: this.sessionId,
      thresholdMB: this.reportThresholdMB,
      enabled: this.isEnabled,
      testMode: this.testMode
    };
  }

  /**
   * 重置会话（重新登录时调用）
   */
  resetSession(): void {
    this.sessionId = this.generateSessionId();
    this.lastReportedTraffic = {
      uploadBytes: 0,
      downloadBytes: 0,
      lastReportTime: Date.now()
    };
    this.saveReportState();
    console.log('🔄 流量上报会话已重置:', this.sessionId);
  }

  /**
   * 设置上报阈值
   */
  setReportThreshold(thresholdMB: number): void {
    if (thresholdMB >= 0) {
      this.reportThresholdMB = thresholdMB;
      console.log(`🔧 流量上报阈值已设置为: ${thresholdMB}MB`);
    } else {
      console.warn('⚠️ 流量上报阈值必须大于等于0');
    }
  }

  /**
   * 启用/禁用测试模式
   */
  setTestMode(enabled: boolean): void {
    this.testMode = enabled;
    if (enabled) {
      console.log('🧪 测试模式已启用 - 将直接上报所有流量变化');
    } else {
      console.log(`📊 生产模式已启用 - 阈值: ${this.reportThresholdMB}MB`);
    }
  }

  /**
   * 切换到生产模式
   */
  setProductionMode(thresholdMB: number = 500): void {
    this.testMode = false;
    this.reportThresholdMB = thresholdMB;
    console.log(`🚀 已切换到生产模式，上报阈值: ${thresholdMB}MB`);
  }

  /**
   * 强制上报当前累计流量
   */
  async forceReport(): Promise<TrafficReportResponse | null> {
    if (!this.isEnabled || !authService.isAuthenticated()) {
      console.warn('⚠️ 流量上报已禁用或用户未认证');
      return null;
    }

    try {
      const currentTime = Date.now();
      const timeSinceLastReport = (currentTime - this.lastReportedTraffic.lastReportTime) / 1000;
      
      if (timeSinceLastReport < 30) { // 防止频繁上报
        console.warn('⚠️ 距离上次上报时间太短，请稍后再试');
        return null;
      }

      const uploadMB = this.bytesToMB(this.lastReportedTraffic.uploadBytes);
      const downloadMB = this.bytesToMB(this.lastReportedTraffic.downloadBytes);
      
      if (uploadMB === 0 && downloadMB === 0) {
        console.log('📊 当前无流量数据需要上报');
        return null;
      }

      console.log('🔄 强制上报流量...');
      const result = await this.reportTraffic(uploadMB, downloadMB);
      
      // 重置累计流量
      this.lastReportedTraffic = {
        uploadBytes: 0,
        downloadBytes: 0,
        lastReportTime: currentTime
      };
      this.saveReportState();
      
      return result;
    } catch (error) {
      console.error('❌ 强制上报失败:', error);
      throw error;
    }
  }

  /**
   * 获取流量统计信息
   */
  getTrafficStats(): {
    totalUploadMB: number;
    totalDownloadMB: number;
    totalMB: number;
    progressToNextReport: number;
    nextReportAtMB: number;
  } {
    const uploadMB = this.bytesToMB(this.lastReportedTraffic.uploadBytes);
    const downloadMB = this.bytesToMB(this.lastReportedTraffic.downloadBytes);
    const totalMB = uploadMB + downloadMB;
    const nextReportAtMB = Math.ceil(totalMB / this.reportThresholdMB) * this.reportThresholdMB;
    const progressToNextReport = (totalMB % this.reportThresholdMB) / this.reportThresholdMB * 100;

    return {
      totalUploadMB: uploadMB,
      totalDownloadMB: downloadMB,
      totalMB,
      progressToNextReport,
      nextReportAtMB
    };
  }
}

// 创建单例实例
export const trafficReporter = new TrafficReporter();

// 导出类型和服务
export { TrafficReporter };
export default trafficReporter; 