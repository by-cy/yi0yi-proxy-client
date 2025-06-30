import axios, { AxiosInstance } from 'axios';
import { AUTH_API_CONFIG } from './api';

// APP ID 常量定义
export const APP_IDS = {
  ANDROID: 'app_android_v1',
  IOS: 'app_ios_v1', 
  MAC: 'app_mac_v1',
  BROWSER: 'app_browser_v1',
  WINDOWS: 'app_windows_v1',
  PAYMENT_SERVICE: 'app_payment_service'
} as const;

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType?: string;
  expiresIn?: number;
  expires_in?: number; // 备用字段名
}

export interface AuthState {
  isAuthenticated: boolean;
  user: any | null;
  accessToken: string | null;
  refreshToken: string | null;
}

class AuthService {
  private authState: AuthState = {
    isAuthenticated: false,
    user: null,
    accessToken: null,
    refreshToken: null
  };

  private api: AxiosInstance;
  private refreshPromise: Promise<AuthResponse> | null = null;

  constructor() {
    // 创建 API 客户端
    this.api = axios.create({
      baseURL: AUTH_API_CONFIG.baseURL,
      timeout: AUTH_API_CONFIG.timeout,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // 设置请求拦截器 - 自动添加 Authorization header
    this.api.interceptors.request.use((config) => {
      const token = this.authState.accessToken || localStorage.getItem('accessToken');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // 设置响应拦截器 - 自动处理 token 刷新
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          
          try {
            console.warn('🔄 Access token expired, attempting to refresh...');
            await this.refreshAccessToken();
            
            // 重试原请求
            const newToken = this.authState.accessToken || localStorage.getItem('accessToken');
            if (newToken && originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
            }
            return this.api.request(originalRequest);
          } catch (refreshError) {
            console.error('❌ Token refresh failed, logging out user');
            await this.clearAuthState();
            throw refreshError;
          }
        }
        
        return Promise.reject(error);
      }
    );

    // 恢复认证状态
    this.restoreAuthState();
    
    console.warn('🚀 AuthService initialized');
  }

  /**
   * 获取设备 APP ID
   */
  private getAppId(): string {
    // 检测运行环境
    if (typeof window !== 'undefined' && (window as any).__TAURI__) {
      const platform = window.navigator.platform.toLowerCase();
      if (platform.includes('mac')) {
        return APP_IDS.MAC;
      } else if (platform.includes('win')) {
        return APP_IDS.WINDOWS;
      }
    }
    
    // 后备检测方法
    const userAgent = navigator.userAgent.toLowerCase();
    if (/mac/i.test(userAgent)) {
      return APP_IDS.MAC;
    } else if (/win/i.test(userAgent)) {
      return APP_IDS.WINDOWS;
    }
    
    return APP_IDS.BROWSER; // 默认值
  }

  /**
   * 用户登录
   */
  async completeLogin(credentials: LoginCredentials): Promise<void> {
    try {
      console.warn('🚀 Starting login...');
      console.warn('👤 Email:', credentials.email);

      if (!credentials.email || !credentials.password) {
        throw new Error('Email and password are required');
      }

      const appId = this.getAppId();
      console.warn('📱 App ID:', appId);

      const response = await this.api.post<AuthResponse>(AUTH_API_CONFIG.endpoints.login, {
        email: credentials.email,
        password: credentials.password,
        appId: appId
      });

      const authData = response.data;
      console.warn('✅ Login successful');
      console.warn('📊 API Response:', JSON.stringify(authData, null, 2));

      // 保存认证数据
      await this.storeAuthData(authData);

      // 更新认证状态
      this.authState = {
        isAuthenticated: true,
        user: {
          email: credentials.email,
          loginTime: new Date().toISOString(),
          appId: appId
        },
        accessToken: authData.accessToken,
        refreshToken: authData.refreshToken
      };

      console.warn('🎉 Login completed successfully!');

    } catch (error: any) {
      console.error('❌ Login failed:', error);
      
      await this.clearAuthState();
      
      // 处理具体的错误类型
      if (error.response) {
        // 有响应的HTTP错误
        if (error.response.status === 400) {
          const errorMsg = error.response.data?.error || 'Invalid request';
          throw new Error(errorMsg);
        } else if (error.response.status === 401) {
          throw new Error('Invalid email or password');
        } else if (error.response.status >= 500) {
          throw new Error('Server error. Please try again later.');
        }
      } else if (error.code === 'NETWORK_ERROR' || error.message?.includes('Network Error')) {
        // 真正的网络错误
        throw new Error('Network error. Please check your connection.');
      } else if (error.message?.includes('Missing') || error.message?.includes('authData')) {
        // 数据处理错误
        throw new Error(`Login response error: ${error.message}`);
      }
      
      // 其他错误
      throw new Error(`Login failed: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * 刷新访问令牌
   */
  async refreshAccessToken(): Promise<AuthResponse> {
    // 防止并发刷新
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this._performTokenRefresh();
    
    try {
      const result = await this.refreshPromise;
      return result;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async _performTokenRefresh(): Promise<AuthResponse> {
    const refreshToken = this.authState.refreshToken || localStorage.getItem('refreshToken');
    
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      console.warn('🔄 Refreshing access token...');
      
      const response = await axios.post<AuthResponse>(AUTH_API_CONFIG.baseURL + AUTH_API_CONFIG.endpoints.refresh, {
        refreshToken: refreshToken
      }, {
        timeout: AUTH_API_CONFIG.timeout,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const authData = response.data;
      
      // 保存新的认证数据
      await this.storeAuthData(authData);
      
      // 更新内存中的状态
      this.authState.accessToken = authData.accessToken;
      this.authState.refreshToken = authData.refreshToken;
      
      console.warn('✅ Token refreshed successfully');
      return authData;
      
    } catch (error: any) {
      console.error('❌ Token refresh failed:', error);
      
      if (error.response?.status === 401) {
        throw new Error('Refresh token expired');
      }
      
      throw new Error('Failed to refresh token');
    }
  }

  /**
   * 存储认证数据
   */
  private async storeAuthData(authData: any): Promise<void> {
    try {
      console.warn('📝 Storing auth data:', {
        hasAccessToken: !!authData.accessToken,
        hasRefreshToken: !!authData.refreshToken,
        hasTokenType: !!authData.tokenType,
        hasExpiresIn: !!authData.expiresIn,
        expiresInValue: authData.expiresIn,
        expiresInType: typeof authData.expiresIn,
        allKeys: Object.keys(authData)
      });

      if (!authData.accessToken) {
        throw new Error('Missing accessToken in response');
      }
      if (!authData.refreshToken) {
        throw new Error('Missing refreshToken in response');
      }

      localStorage.setItem('accessToken', authData.accessToken);
      localStorage.setItem('refreshToken', authData.refreshToken);
      localStorage.setItem('tokenType', authData.tokenType || 'Bearer');
      
      // 处理 expiresIn 字段，设置默认值
      const expiresIn = authData.expiresIn || authData.expires_in || 10800; // 默认3小时
      localStorage.setItem('expiresIn', expiresIn.toString());
      
      localStorage.setItem('auth_timestamp', Date.now().toString());
      localStorage.setItem('authenticated', 'true');
      
      console.warn('💾 Auth data stored successfully');
    } catch (error) {
      console.error('❌ Failed to store auth data:', error);
      throw error;
    }
  }

  /**
   * 恢复认证状态
   */
  private async restoreAuthState(): Promise<void> {
    try {
      const isAuthenticated = localStorage.getItem('authenticated') === 'true';
      const accessToken = localStorage.getItem('accessToken');
      const refreshToken = localStorage.getItem('refreshToken');
      
      if (isAuthenticated && accessToken && refreshToken) {
        console.warn('🔄 Restoring authentication state...');
        
        // 检查 token 是否过期
        const timestamp = localStorage.getItem('auth_timestamp');
        const expiresIn = localStorage.getItem('expiresIn');
        
        if (timestamp && expiresIn) {
          const age = Date.now() - parseInt(timestamp);
          const maxAge = parseInt(expiresIn) * 1000; // 转换为毫秒
          
          if (age > maxAge) {
            console.warn('⏰ Access token expired, will refresh on next request');
          }
        }
        
        // 恢复认证状态
        this.authState = {
          isAuthenticated: true,
          user: {
            loginTime: timestamp ? new Date(parseInt(timestamp)).toISOString() : new Date().toISOString()
          },
          accessToken: accessToken,
          refreshToken: refreshToken
        };
        
        console.warn('✅ Authentication state restored');
      }
    } catch (error) {
      console.error('❌ Failed to restore auth state:', error);
      await this.clearAuthState();
    }
  }

  /**
   * 用户登出
   */
  async logout(allDevices: boolean = false): Promise<void> {
    try {
      console.warn('👋 Starting logout process...');
      
      const accessToken = this.authState.accessToken || localStorage.getItem('accessToken');
      
      if (accessToken) {
        try {
          // 调用登出 API
          const appId = allDevices ? undefined : this.getAppId();
          const url = appId ? `${AUTH_API_CONFIG.endpoints.logout}?appId=${appId}` : AUTH_API_CONFIG.endpoints.logout;
          
          await this.api.post(url);
          console.warn('✅ Server logout successful');
        } catch (error: any) {
          console.warn('⚠️ Server logout failed:', error.message);
          // 即使服务器登出失败，也要清理本地状态
        }
      }
      
      // 清理本地状态
      await this.clearAuthState();
      
      console.warn('✅ Logout completed');
      
    } catch (error) {
      console.error('❌ Logout failed:', error);
      // 即使出错也要清理本地状态
      await this.clearAuthState();
      throw error;
    }
  }

  /**
   * 清理认证状态
   */
  private async clearAuthState(): Promise<void> {
    try {
      // 清理 localStorage
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('tokenType');
      localStorage.removeItem('expiresIn');
      localStorage.removeItem('auth_timestamp');
      localStorage.removeItem('authenticated');
      
      // 重置内存状态
      this.authState = {
        isAuthenticated: false,
        user: null,
        accessToken: null,
        refreshToken: null
      };
      
      console.warn('🧹 Auth state cleared');
    } catch (error) {
      console.error('❌ Failed to clear auth state:', error);
    }
  }

  /**
   * 获取当前认证状态
   */
  getAuthState(): AuthState {
    return { ...this.authState };
  }

  /**
   * 检查是否已认证
   */
  isAuthenticated(): boolean {
    return this.authState.isAuthenticated;
  }

  /**
   * 获取当前用户
   */
  getCurrentUser(): any | null {
    return this.authState.user;
  }

  /**
   * 获取访问令牌
   */
  getAccessToken(): string | null {
    return this.authState.accessToken || localStorage.getItem('accessToken');
  }

  /**
   * 获取当前检测到的 APP ID (用于调试)
   */
  getDetectedAppId(): string {
    return this.getAppId();
  }

  /**
   * 检查会话有效性
   */
  async validateSession(): Promise<boolean> {
    try {
      if (!this.isAuthenticated()) {
        return false;
      }

      const accessToken = this.getAccessToken();
      if (!accessToken) {
        await this.clearAuthState();
        return false;
      }

      // 检查 token 是否即将过期（提前5分钟刷新）
      const timestamp = localStorage.getItem('auth_timestamp');
      const expiresIn = localStorage.getItem('expiresIn');
      
      if (timestamp && expiresIn) {
        const age = Date.now() - parseInt(timestamp);
        const maxAge = parseInt(expiresIn) * 1000;
        const refreshThreshold = maxAge - (5 * 60 * 1000); // 提前5分钟
        
        if (age > refreshThreshold) {
          try {
            await this.refreshAccessToken();
          } catch (error) {
            console.warn('⚠️ Token refresh failed during validation');
            return false;
          }
        }
      }

      return true;
      
    } catch (error) {
      console.warn('⚠️ Session validation failed:', error);
      await this.clearAuthState();
      return false;
    }
  }

  /**
   * 创建认证请求方法
   */
  async makeAuthenticatedRequest(url: string, options: RequestInit = {}): Promise<Response> {
    const token = this.getAccessToken();
    
    if (!token) {
      throw new Error('No access token available');
    }

    return fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
  }
}

// 创建单例实例
export const authService = new AuthService();

// 导出类型和服务
export { AuthService };
export default authService; 