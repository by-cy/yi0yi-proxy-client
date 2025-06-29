# 迁移到 React ClerkProvider 指南

## 🎯 概述

本指南帮助你从当前的 `@clerk/clerk-js` 迁移到 `@clerk/react` 的 `<ClerkProvider>` 组件。

## 📦 安装依赖

```bash
# 安装 React Clerk 组件
pnpm add @clerk/react

# 可选：移除原有的 clerk-js（如果完全迁移）
# pnpm remove @clerk/clerk-js
```

## 🔧 迁移步骤

### 1. 更新 main.tsx

```tsx
// src/main.tsx
import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ClerkProvider } from "@clerk/react";

// 首先加载 Tauri Clerk polyfill
import "./polyfills/tauri-clerk.js";
import { setupTauriErrorHandler } from "./utils/tauri-error-handler";

import "./assets/styles/index.scss";

// 设置 Tauri 错误处理器
setupTauriErrorHandler();

const clerkConfig = {
  publishableKey: import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || 'pk_test_c3VwcmVtZS1qYXZlbGluLTQ3LmNsZXJrLmFjY291bnRzLmRldiQ',
  frontendApi: import.meta.env.VITE_CLERK_FRONTEND_API || 'https://supreme-javelin-47.clerk.accounts.dev',
};

createRoot(container!).render(
  <React.StrictMode>
    <ClerkProvider
      publishableKey={clerkConfig.publishableKey}
      frontendApi={clerkConfig.frontendApi}
      crossOrigin="include"                    // <- 这就是你想要的功能
      navigate={(to) => window.history.pushState(null, '', to)}
    >
      <ComposeContextProvider contexts={contexts}>
        <BaseErrorBoundary>
          <BrowserRouter>
            {/* 移除原有的 AuthProvider，使用 Clerk 的认证状态 */}
            <AppDataProvider>
              <Layout />
            </AppDataProvider>
          </BrowserRouter>
        </BaseErrorBoundary>
      </ComposeContextProvider>
    </ClerkProvider>
  </React.StrictMode>
);
```

### 2. 更新 AuthProvider

```tsx
// src/providers/auth-provider.tsx
import React, { createContext, useContext, useEffect, useRef } from "react";
import { useUser, useAuth } from "@clerk/react";
import { Notice } from "@/components/base";
// ... 其他导入

interface AuthContextType {
  user: any | null;
  loading: boolean;
  isLoggedIn: boolean;
  logout: () => void;
  refreshUserInfo: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoaded } = useUser();
  const { signOut, isSignedIn } = useAuth();
  const profileLoadAttempted = useRef(false);

  // 加载默认配置文件的逻辑保持不变
  const loadDefaultProfile = async () => {
    // ... 现有逻辑
  };

  const handleLogout = async () => {
    try {
      await signOut();
      Notice.info("Logged out successfully");
    } catch (error) {
      console.error("Logout error:", error);
      Notice.error("Logout failed");
    }
  };

  const refreshUserInfo = async () => {
    // 在 React Clerk 中，用户信息自动刷新
    console.log('User info refreshed automatically by Clerk');
  };

  // 当用户登录时加载默认配置
  useEffect(() => {
    if (isSignedIn && !profileLoadAttempted.current) {
      loadDefaultProfile();
    }
  }, [isSignedIn]);

  const value = {
    user,
    loading: !isLoaded,
    isLoggedIn: !!isSignedIn,
    logout: handleLogout,
    refreshUserInfo,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAppAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAppAuth must be used within an AuthProvider');
  }
  return context;
};
```

### 3. 更新登录组件

```tsx
// src/components/auth/login-form.tsx
import React, { useState } from 'react';
import { useSignIn, useSignUp } from '@clerk/react';
import { Notice } from "@/components/base";

export const LoginForm: React.FC = () => {
  const { signIn, setActive, isLoaded } = useSignIn();
  const { signUp } = useSignUp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isLoaded) return;

    try {
      if (isSignUp) {
        // 注册逻辑
        const result = await signUp.create({
          emailAddress: email,
          password: password,
        });

        if (result.status === 'complete') {
          await setActive({ session: result.createdSessionId });
          Notice.success('Sign up successful!');
        }
      } else {
        // 登录逻辑
        const result = await signIn.create({
          identifier: email,
          password: password,
        });

        if (result.status === 'complete') {
          await setActive({ session: result.createdSessionId });
          Notice.success('Sign in successful!');
        }
      }
    } catch (error: any) {
      Notice.error(error.errors?.[0]?.message || 'Authentication failed');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* 表单内容 */}
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        required
      />
      <button type="submit">
        {isSignUp ? 'Sign Up' : 'Sign In'}
      </button>
      <button type="button" onClick={() => setIsSignUp(!isSignUp)}>
        {isSignUp ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
      </button>
    </form>
  );
};
```

### 4. 更新路由保护

```tsx
// src/components/auth/protected-route.tsx
import React from 'react';
import { useAuth } from '@clerk/react';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return <div>Loading...</div>;
  }

  if (!isSignedIn) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
```

## ✅ 迁移完成后的优势

1. **内置跨域支持**: `crossOrigin="include"` 开箱即用
2. **自动状态管理**: 无需手动监听认证状态变化
3. **React Hooks**: 使用 `useUser`, `useAuth`, `useSignIn` 等
4. **更好的 TypeScript 支持**: 完整的类型定义
5. **SSR 支持**: 如果将来需要 SSR

## ⚠️ 注意事项

1. **向后兼容**: 可以保留 `@clerk/clerk-js` 作为备用
2. **Tauri 兼容性**: 确保所有 polyfill 仍然有效
3. **测试**: 充分测试所有认证流程

## 🔄 回滚计划

如果迁移遇到问题，可以快速回滚：

```bash
# 回滚到原始实现
git checkout -- src/main.tsx src/providers/auth-provider.tsx
```

---

选择适合你的方案进行实施！ 