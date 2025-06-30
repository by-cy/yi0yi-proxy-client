import { BaseLoadingOverlay } from "@/components/base";
import { useAuth } from "@/providers/auth-provider";
import React, { useEffect } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isLoading, isSignedIn } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  // 调试日志
  console.log('🛡️ ProtectedRoute check:', {
    pathname: location.pathname,
    isLoading,
    isSignedIn,
    timestamp: new Date().toISOString()
  });
  
  // 确保在加载完成后再进行路由判断
  useEffect(() => {
    if (!isLoading) {
      if (isSignedIn && location.pathname === '/login') {
        // 如果已登录但在登录页面，重定向到首页
        console.log('✅ 用户已登录，从登录页重定向到首页');
        navigate('/home', { replace: true });
      }
    }
  }, [isLoading, isSignedIn, location.pathname, navigate]);
  
  // Show loading when checking authentication status
  if (isLoading) {
    console.log('⏳ ProtectedRoute: 显示加载状态');
    return <BaseLoadingOverlay isLoading={true} />;
  }
  
  // Redirect to login if not authenticated
  if (!isSignedIn) {
    console.log('🚫 ProtectedRoute: 用户未登录，重定向到登录页');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  // Render children if authenticated
  console.log('✅ ProtectedRoute: 用户已登录，渲染子组件');
  return <>{children}</>;
}; 