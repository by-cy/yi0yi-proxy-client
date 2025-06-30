import authService from "@/services/auth-service";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
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

  const updateAuthState = useCallback(() => {
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
  }, []);

  const signOut = async (logoutAllDevices: boolean = false): Promise<void> => {
    try {
      console.log('🚪 开始登出...');
      await authService.logout(logoutAllDevices);
      setAuthState(prev => ({ ...prev, isLoading: true }));
      updateAuthState();
      console.log('✅ 登出成功');
    } catch (error) {
      console.error('❌ 登出失败:', error);
      // 即使出错也更新状态，确保界面正确显示
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
        
        // 更新认证状态
        updateAuthState();
        
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