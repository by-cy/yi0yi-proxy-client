import { Notice } from '@/components/base';
import authService from "@/services/auth-service";
import { patchVergeConfig } from '@/services/cmds';
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { updateProxyConfiguration } from '../services/proxy-config';
import trafficReporter from '../services/traffic-reporter';

interface AuthState {
  isSignedIn: boolean;
  user: any | null;
  isLoading: boolean;
}

interface AuthContextType extends AuthState {
  signOut: (logoutAllDevices?: boolean) => Promise<void>;
  refreshAuth: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    isSignedIn: false,
    user: null,
    isLoading: true,
  });
  
  // 标记是否已经加载过proxy配置，确保只加载一次
  const [hasLoadedProxyConfig, setHasLoadedProxyConfig] = useState(false);

  const updateAuthState = useCallback(async () => {
    const isAuthenticated = authService.isAuthenticated();
    const user = authService.getCurrentUser();
      
    console.log('📊 Updating auth state:', {
      isAuthenticated,
      hasUser: !!user,
      userEmail: user?.email
    });
    
    setAuthState({
      isSignedIn: isAuthenticated,
      user: user,
      isLoading: false,
    });

    // 如果用户已认证且还没有加载过proxy配置，自动加载一次
    if (isAuthenticated && user && !hasLoadedProxyConfig) {
      console.log('🌐 [updateAuthState] 检测到用户已认证，开始加载proxy配置...', {
        isAuthenticated,
        hasUser: !!user,
        hasLoadedProxyConfig
      });
      try {
        trafficReporter.resetSession();
        console.log('🚀 [updateAuthState] 流量上报会话已重置');
        
        const result = await updateProxyConfiguration();
        if (result.success) {
          console.log('✅ [updateAuthState] Proxy配置加载成功:', result.message);
          setHasLoadedProxyConfig(true);
          Notice.success('代理配置加载成功', 2000);
        } else {
          console.error('❌ [updateAuthState] Proxy配置加载失败:', result.message);
          Notice.error(`代理配置加载失败: ${result.message}`, 5000);
        }
      } catch (error) {
        console.error('❌ [updateAuthState] 加载proxy配置时出错:', error);
        const errorMessage = error instanceof Error ? error.message : '未知错误';
        Notice.error(`代理配置加载异常: ${errorMessage}`, 5000);
        }
    } else {
      console.log('⏭️ [updateAuthState] 跳过proxy配置加载', {
        isAuthenticated,
        hasUser: !!user,
        hasLoadedProxyConfig,
        reason: !isAuthenticated ? '未认证' : !user ? '无用户信息' : hasLoadedProxyConfig ? '已加载过' : '未知'
      });
    }
  }, [hasLoadedProxyConfig]);

  const signOut = async (logoutAllDevices: boolean = false): Promise<void> => {
    try {
      console.log('🚪 开始登出...');
      
      // 首先关闭系统代理
      try {
        console.log('🔌 正在关闭系统代理...');
        await patchVergeConfig({ enable_system_proxy: false });
        console.log('✅ 系统代理已关闭');
      } catch (error) {
        console.warn('⚠️ 关闭系统代理失败:', error);
        // 即使系统代理关闭失败也继续登出流程
      }
      
      // 清除保存的登录凭据（出于安全考虑）
      try {
        localStorage.removeItem("yi0yi_remembered_email");
        localStorage.removeItem("yi0yi_remembered_password");
        localStorage.removeItem("yi0yi_remember_me");
        console.log('✅ 已清除保存的登录凭据');
      } catch (error) {
        console.warn('⚠️ 清除保存的凭据失败:', error);
      }
      
      await authService.logout(logoutAllDevices);
      setAuthState(prev => ({ ...prev, isLoading: true }));
      // 重置proxy配置加载标志，允许重新登录时再次加载
      setHasLoadedProxyConfig(false);
      updateAuthState();
      console.log('✅ 登出成功');
    } catch (error) {
      console.error('❌ 登出失败:', error);
      // 即使出错也更新状态，确保界面正确显示
      setHasLoadedProxyConfig(false);
      updateAuthState();
    }
  };

  const refreshAuth = async (): Promise<boolean> => {
    try {
      console.log('🔄 刷新认证状态...');
      const isAuthenticated = authService.isAuthenticated();
      const currentUser = authService.getCurrentUser();
      
      setAuthState(prev => ({ ...prev, isSignedIn: isAuthenticated, user: currentUser }));
      
      // 如果用户已认证，重置流量上报会话
      if (isAuthenticated && currentUser) {
        trafficReporter.resetSession();
        console.log('🚀 流量上报会话已重置');
        
        // 如果用户已认证且还没有加载过proxy配置，自动加载一次
        if (!hasLoadedProxyConfig) {
          console.log('🌐 用户首次登录，开始加载proxy配置...', {
            hasLoadedProxyConfig,
            isAuthenticated,
            hasUser: !!currentUser
          });
          try {
            const result = await updateProxyConfiguration();
            if (result.success) {
              console.log('✅ Proxy配置加载成功:', result.message);
              setHasLoadedProxyConfig(true);
              Notice.success('代理配置加载成功', 2000);
            } else {
              console.error('❌ Proxy配置加载失败:', result.message);
              Notice.error(`代理配置加载失败: ${result.message}`, 5000);
            }
          } catch (error) {
            console.error('❌ 加载proxy配置时出错:', error);
            const errorMessage = error instanceof Error ? error.message : '未知错误';
            Notice.error(`代理配置加载异常: ${errorMessage}`, 5000);
          }
        } else {
          console.log('⏭️ 跳过proxy配置加载 - 已经加载过了', { hasLoadedProxyConfig });
        }
      }
      
      console.log('✅ 认证状态刷新完成:', { isAuthenticated, user: currentUser });
      
      return isAuthenticated;
    } catch (error) {
      console.error('❌ 刷新认证状态失败:', error);
      setAuthState(prev => ({ ...prev, isSignedIn: false, user: null }));
      return false;
    }
  };

  useEffect(() => {
    // 初始化认证状态
    const initializeAuth = async () => {
      try {
        console.log('Initializing auth state...');

        // 验证会话有效性
        await authService.validateSession();
        
        // 更新认证状态（现在是async的）
        await updateAuthState();
            
        console.log('Auth state initialized successfully');
      } catch (error) {
        console.error('Failed to initialize auth state:', error);
        // 设置默认状态，即使初始化失败
        setAuthState({
          isSignedIn: false,
          user: null,
          isLoading: false,
        });
      }
    };

    initializeAuth();
  }, [updateAuthState]);

  const value: AuthContextType = {
    ...authState,
    signOut,
    refreshAuth,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 