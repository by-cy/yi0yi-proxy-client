import { Clerk } from '@clerk/clerk-js';

// 检测 Tauri 环境
const isTauriEnvironment = () => {
  return window?.location?.protocol === 'tauri:' || 
         (window as any)?.__TAURI__ !== undefined ||
         window?.navigator?.userAgent?.includes('Tauri');
};

// Clerk configuration - 根据环境使用不同密钥
const getClerkConfig = () => {
  // 优先使用环境变量
  const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || 'pk_test_c3VwcmVtZS1qYXZlbGluLTQ3LmNsZXJrLmFjY291bnRzLmRldiQ';
  
  // Tauri 特定配置
  const tauriConfig = isTauriEnvironment() ? {
    // 在 Tauri 中禁用某些可能有问题的功能
    appearance: {
      elements: {
        modalCloseButton: { display: 'none' }, // 隐藏可能调用 window.close 的按钮
      }
    },
    // 配置适合 Tauri 的认证流程
    signInUrl: window.location.origin + '/login',
    signUpUrl: window.location.origin + '/login',
    afterSignInUrl: window.location.origin + '/',
    afterSignUpUrl: window.location.origin + '/',
  } : {};
  
  return {
    publishableKey,
    environment: publishableKey.startsWith('pk_live_') ? 'production' : 'development',
    ...tauriConfig
  };
};

const validateClerkConfig = (): boolean => {
  const config = getClerkConfig();
  const isValid = !!(
    config.publishableKey && 
    config.publishableKey.startsWith('pk_')
  );
  
  if (!isValid) {
    console.warn('❌ Clerk configuration is not valid. Please check your Clerk keys.');
  } else {
    console.log(`✅ Clerk configuration validated successfully`);
    console.log(`📦 Environment: ${config.environment}`);
    console.log(`🔑 Using key: ${config.publishableKey.substring(0, 15)}...`);
  }
  
  return isValid;
};

// Global Clerk instance
let clerkInstance: Clerk | null = null;

export const initializeClerk = async (retries = 3): Promise<Clerk> => {
  if (clerkInstance) {
    console.log('Clerk already initialized, returning existing instance');
    return clerkInstance;
  }

  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`Attempting to initialize Clerk (attempt ${attempt}/${retries})...`);
      
      // Validate configuration before attempting to initialize
      if (!validateClerkConfig()) {
        throw new Error('Invalid Clerk configuration. Please check your Publishable Key.');
      }
      
      // 在 CI 环境中显示详细配置信息
      if (import.meta.env.VITE_CI) {
        const config = getClerkConfig();
        console.log(`🏗️ CI Build Environment Detected`);
        console.log(`📦 Environment: ${config.environment}`);
        console.log(`🔑 Publishable Key: ${config.publishableKey}`);
        console.log(`🌐 Frontend API: ${import.meta.env.VITE_CLERK_FRONTEND_API || 'default'}`);
      }
      
      const config = getClerkConfig();
      const publishableKey = config.publishableKey;
      console.log('Creating new Clerk instance with key:', publishableKey.substring(0, 20) + '...');
      
      // 检测和记录环境信息
      if (isTauriEnvironment()) {
        console.log('🚀 Tauri environment detected, using Tauri-specific configuration');
      }
      
      // Initialize Clerk with configuration (包括 Tauri 特定配置和跨域支持)
      const clerkOptions = {
        publishableKey,
                // 跨域支持配置
        httpOptions: {
          credentials: 'include', // 等同于 crossOrigin="include"
          headers: {
            'Access-Control-Allow-Credentials': 'true',
          }
        },
        
        // 在 Tauri 环境中使用 redirect 模式避免 popup 问题
        ...(isTauriEnvironment() && {
          signInForceRedirectUrl: window.location.origin + '/login',
          signUpForceRedirectUrl: window.location.origin + '/login', 
          signInFallbackRedirectUrl: window.location.origin + '/',
          signUpFallbackRedirectUrl: window.location.origin + '/',
          // 禁用弹出窗口模式，强制使用重定向
          allowedRedirectOrigins: [window.location.origin],
          // 确保在 Tauri 中不使用弹窗
          experimentalForceRedirectWrapper: true
        }),
        
        // Clerk Frontend API URL (生产环境)
        ...(import.meta.env.VITE_CLERK_FRONTEND_API && {
          frontendApi: import.meta.env.VITE_CLERK_FRONTEND_API
        }),
        ...(config.appearance && { appearance: config.appearance }),
        ...(config.signInUrl && { signInUrl: config.signInUrl }),
        ...(config.signUpUrl && { signUpUrl: config.signUpUrl }),
        ...(config.afterSignInUrl && { afterSignInUrl: config.afterSignInUrl }),
        ...(config.afterSignUpUrl && { afterSignUpUrl: config.afterSignUpUrl }),
      };
      
      console.log('Clerk options:', { 
        ...clerkOptions, 
        publishableKey: publishableKey.substring(0, 20) + '...',
        frontendApi: clerkOptions.frontendApi ? clerkOptions.frontendApi.substring(0, 30) + '...' : 'default',
        crossOriginEnabled: true // 明确标明跨域已启用
      });
      
      console.log('🌐 Cross-Origin support enabled (credentials: include)');
      
      clerkInstance = new Clerk(clerkOptions.publishableKey, {
        httpOptions: clerkOptions.httpOptions,
        ...(clerkOptions.frontendApi && { frontendApi: clerkOptions.frontendApi })
      });
      
      console.log('Loading Clerk instance...');
      
      // 添加 Tauri 特定的错误处理
      try {
        await clerkInstance.load();
      } catch (loadError) {
        if (isTauriEnvironment() && (loadError as Error).message?.includes('close')) {
          console.warn('⚠️ Tauri-specific Clerk loading issue detected, attempting recovery...');
          // 稍等片刻后重试
          await new Promise(resolve => setTimeout(resolve, 500));
          await clerkInstance.load();
        } else {
          throw loadError;
        }
      }
      
      console.log('Clerk instance loaded successfully');
      return clerkInstance;
    } catch (error) {
      lastError = error as Error;
      console.error(`Failed to initialize Clerk (attempt ${attempt}/${retries}):`, error);
      
      // Reset instance on error
      clerkInstance = null;
      
      // Wait before retry (except on last attempt)
      if (attempt < retries) {
        const waitTime = 1000 * attempt; // Progressive backoff
        console.log(`Waiting ${waitTime}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
  
  throw lastError || new Error('Failed to initialize Clerk after all retries');
};

export const getClerk = (): Clerk | null => {
  return clerkInstance;
};

export const signIn = async (emailAddress: string, password: string) => {
  const clerk = getClerk();
  if (!clerk || !clerk.client) {
    console.error('Clerk not initialized. Please call initializeClerk() first.');
    throw new Error('Clerk not initialized');
  }
  
  try {
    console.log('Attempting to sign in with email:', emailAddress);
    console.log('Clerk client ready:', !!clerk.client);
    
    const signInAttempt = await clerk.client.signIn.create({
      identifier: emailAddress,
      password,
    });

    console.log('Sign in attempt status:', signInAttempt.status);

    if (signInAttempt.status === 'complete') {
      // 在 Tauri 环境中添加特殊处理
      if (isTauriEnvironment()) {
        console.log('🚀 Tauri environment: handling sign-in completion');
        
        // 添加延迟以确保状态稳定
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      await clerk.setActive({ session: signInAttempt.createdSessionId });
      console.log('Sign in completed successfully');
      return signInAttempt;
    } else {
      // Handle other statuses (needs verification, etc.)
      console.log('Sign in incomplete, status:', signInAttempt.status);
      throw new Error(`Sign in incomplete: ${signInAttempt.status}`);
    }
  } catch (error) {
    // Tauri 特定错误处理
    if (isTauriEnvironment() && error instanceof Error && error.message?.includes('close')) {
      console.warn('⚠️ Tauri-specific error detected during sign-in, handling gracefully');
      // 尝试获取当前会话状态
      try {
        if (clerk.user) {
          console.log('✅ User is actually signed in despite the error');
          return { status: 'complete', createdSessionId: clerk.session?.id };
        }
      } catch (recoveryError) {
        console.warn('Recovery attempt failed:', recoveryError);
      }
    }
    
    console.error('Sign in error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      error,
      isTauri: isTauriEnvironment()
    });
    throw error;
  }
};

export const signUp = async (emailAddress: string, password: string) => {
  const clerk = getClerk();
  if (!clerk || !clerk.client) throw new Error('Clerk not initialized');
  
  try {
    console.log('Attempting to sign up with email:', emailAddress);
    const signUpAttempt = await clerk.client.signUp.create({
      emailAddress,
      password,
    });

    console.log('Sign up attempt status:', signUpAttempt.status);

    if (signUpAttempt.status === 'complete') {
      await clerk.setActive({ session: signUpAttempt.createdSessionId });
      console.log('Sign up completed successfully');
      return signUpAttempt;
    } else {
      // Handle verification
      console.log('Sign up requires verification, status:', signUpAttempt.status);
      return signUpAttempt;
    }
  } catch (error) {
    console.error('Sign up error:', error);
    throw error;
  }
};

export const signOut = async () => {
  const clerk = getClerk();
  if (!clerk) throw new Error('Clerk not initialized');
  
  try {
    console.log('Signing out...');
    
    if (isTauriEnvironment()) {
      console.log('🚀 Tauri environment: handling sign-out');
    }
    
    await clerk.signOut();
    console.log('Sign out completed');
  } catch (error) {
    // Tauri 特定错误处理
    if (isTauriEnvironment() && error instanceof Error && error.message?.includes('close')) {
      console.warn('⚠️ Tauri-specific error during sign-out, checking if user is actually signed out');
      
      // 检查用户是否实际已经登出
      if (!clerk.user) {
        console.log('✅ User is actually signed out despite the error');
        return; // 成功登出
      }
    }
    
    console.error('Sign out error:', {
      error,
      isTauri: isTauriEnvironment(),
      message: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
};

export const getCurrentUser = () => {
  const clerk = getClerk();
  const user = clerk?.user || null;
  console.log('Current user:', user ? 'logged in' : 'not logged in');
  return user;
};

export const isUserSignedIn = () => {
  const clerk = getClerk();
  const signedIn = !!clerk?.user;
  console.log('User signed in:', signedIn);
  return signedIn;
}; 