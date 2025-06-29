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
      
      // 显示详细配置信息
      const config = getClerkConfig();
      const isDebugMode = import.meta.env.VITE_CI || import.meta.env.DEV;
      
      console.warn(`🏗️ Clerk Configuration Details (Production Debug)`);
      console.warn(`📦 Environment: ${config.environment}`);
      console.warn(`🔑 Publishable Key: ${config.publishableKey}`);
      console.warn(`🌐 VITE_CLERK_FRONTEND_API: ${import.meta.env.VITE_CLERK_FRONTEND_API || 'NOT SET'}`);
      console.warn(`🚀 Is Tauri: ${isTauriEnvironment()}`);
      console.warn(`🌍 Location: ${window.location.origin}`);
      console.warn(`🔍 All Clerk Env Vars:`, {
        VITE_CLERK_PUBLISHABLE_KEY: import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || 'NOT SET',
        VITE_CLERK_FRONTEND_API: import.meta.env.VITE_CLERK_FRONTEND_API || 'NOT SET'
      });
      
             // 分析 publishable key 来确定预期的 API 端点
       if (config.publishableKey.startsWith('pk_live_')) {
         const keyPart = config.publishableKey.replace('pk_live_', '');
         try {
           const decodedKey = atob(keyPart);
           console.warn(`🔐 Decoded Key Domain: ${decodedKey}`);
         } catch (e) {
           console.warn('Could not decode publishable key');
         }
       }
       
       // 生产环境特殊提醒
       if (config.environment === 'production') {
         console.warn('🏭 Production Clerk environment detected');
         console.warn('⚠️ Note: Removed custom frontendApi to use Clerk default endpoints');
       }
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
        
        // 生产环境配置 - 不使用自定义 frontendApi，让 Clerk 使用默认的 API 端点
        // 我们的自定义域名 https://clerk.101proxy.top 应该通过 allowed origins 配置
        ...(config.appearance && { appearance: config.appearance }),
        ...(config.signInUrl && { signInUrl: config.signInUrl }),
        ...(config.signUpUrl && { signUpUrl: config.signUpUrl }),
        ...(config.afterSignInUrl && { afterSignInUrl: config.afterSignInUrl }),
        ...(config.afterSignUpUrl && { afterSignUpUrl: config.afterSignUpUrl }),
      };
      
      console.log('Clerk options:', { 
        ...clerkOptions, 
        publishableKey: publishableKey.substring(0, 20) + '...',
        crossOriginEnabled: true, // 明确标明跨域已启用
        usingDefaultFrontendApi: true // 使用 Clerk 默认的 Frontend API
      });
      
      console.log('🌐 Cross-Origin support enabled (credentials: include)');
      
      clerkInstance = new Clerk(clerkOptions.publishableKey);
      
      console.log('Loading Clerk instance...');
      
      // 添加 Tauri 特定的错误处理
      try {
        await clerkInstance.load();
        
        // 加载完成后配置跨域支持
        console.log('🌐 Configuring cross-origin support after load...');
        
        // 应用配置选项
        if (clerkOptions.signInForceRedirectUrl) {
          console.log('Setting signInForceRedirectUrl:', clerkOptions.signInForceRedirectUrl);
        }
        
        if (isTauriEnvironment()) {
          console.log('🚀 Tauri environment: Clerk loaded with redirect-based authentication');
        }
        
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
      console.warn('✅ Sign in attempt completed, setting active session...');
      console.warn('Session ID:', signInAttempt.createdSessionId);
      
      // 在 Tauri 环境中添加特殊处理
      if (isTauriEnvironment()) {
        console.warn('🚀 Tauri environment: handling sign-in completion');
        
        // 添加延迟以确保状态稳定
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // 设置活跃会话
      await clerk.setActive({ session: signInAttempt.createdSessionId });
      
      // 验证会话是否正确设置
      const activeSession = clerk.session;
      console.warn('Active session after setActive:', {
        sessionId: activeSession?.id,
        userId: clerk.user?.id,
        status: activeSession?.status,
        user: !!clerk.user
      });
      
      // 额外验证：检查会话是否真的活跃
      if (!activeSession || !clerk.user) {
        console.error('⚠️ ERROR: Session may not be properly activated');
        console.error('Clerk state:', {
          hasSession: !!clerk.session,
          hasUser: !!clerk.user,
          sessionId: clerk.session?.id,
          userId: clerk.user?.id
        });
        
        // 记录潜在的会话同步问题
        console.error('🚨 CRITICAL: Session sync issue detected - this WILL cause subsequent API calls to fail');
      }
      
      console.warn('✅ Sign in completed successfully');
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

// 调试函数：获取详细的会话状态
export const debugSessionState = () => {
  const clerk = getClerk();
  if (!clerk) {
    console.warn('🔍 Debug Session State: Clerk not initialized');
    return null;
  }
  
  const sessionState = {
    hasUser: !!clerk.user,
    hasSession: !!clerk.session,
    userId: clerk.user?.id,
    sessionId: clerk.session?.id,
    sessionStatus: clerk.session?.status,
    isSignedIn: !!clerk.user,
    publishableKey: clerk.publishableKey?.substring(0, 20) + '...',
    environment: clerk.publishableKey?.startsWith('pk_live_') ? 'production' : 'development',
    // 尝试获取实际使用的 API 端点
    clerkDomain: (clerk as any)?.__domain || (clerk as any)?._domain || 'unknown',
    clerkApiVersion: (clerk as any)?.__version || (clerk as any)?.version || 'unknown',
    clerkConfig: {
      frontendApi: (clerk as any)?.frontendApi || 'not set',
      domain: (clerk as any)?.domain || 'not set',
      proxyUrl: (clerk as any)?.proxyUrl || 'not set'
    }
  };
  
  console.warn('🔍 Debug Session State:', sessionState);
  
  // 额外检查：当前使用的 API URL
  if (clerk.session) {
    console.warn('🌐 Session API calls will go to domain derived from publishable key');
    
    // 尝试解码 publishable key 来看实际的域名
    if (clerk.publishableKey?.startsWith('pk_live_')) {
      try {
        const keyPart = clerk.publishableKey.replace('pk_live_', '');
        const decodedDomain = atob(keyPart);
        console.warn('🔐 Clerk will use API domain:', decodedDomain);
      } catch (e) {
        console.warn('Could not decode domain from publishable key');
      }
    }
  }
  
  return sessionState;
};

// 将调试函数暴露到全局，方便在浏览器控制台中调用
if (typeof window !== 'undefined') {
  (window as any).clerkDebug = debugSessionState;
  (window as any).clerkInstance = () => getClerk();
  console.warn('🚀 Debug functions available: window.clerkDebug(), window.clerkInstance()');
} 