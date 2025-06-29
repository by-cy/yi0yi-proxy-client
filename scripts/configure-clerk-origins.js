#!/usr/bin/env node

/**
 * Clerk Admin API - Configure Allowed Origins for Tauri
 * 用于为 Tauri 应用配置 Clerk 允许的 Origin
 */

import https from 'https';

// 配置
const CONFIG = {
  // Clerk Admin API 端点
  API_BASE: 'https://api.clerk.com/v1',
  
  // Tauri Origins - 根据你的应用配置
  TAURI_ORIGINS: [
    'tauri://localhost',           // 默认 Tauri origin
    'https://clerk.101proxy.top',  // 你的生产 Clerk 域名
    'http://localhost:3000',       // 开发环境
    'http://localhost:5173',       // Vite 开发服务器
  ],
  
  // 从环境变量获取 Secret Key
  SECRET_KEY: process.env.CLERK_SECRET_KEY
};

console.log('🔧 Clerk Origin Configuration Tool');
console.log('==================================\n');

// 验证配置
function validateConfig() {
  if (!CONFIG.SECRET_KEY) {
    console.error('❌ Error: CLERK_SECRET_KEY environment variable is required');
    console.log('\n📋 Usage:');
    console.log('export CLERK_SECRET_KEY=sk_live_your_secret_key');
    console.log('node scripts/configure-clerk-origins.js');
    process.exit(1);
  }
  
  if (!CONFIG.SECRET_KEY.startsWith('sk_')) {
    console.error('❌ Error: Invalid Clerk Secret Key format');
    console.log('Secret Key should start with "sk_test_" or "sk_live_"');
    process.exit(1);
  }
  
  const isProduction = CONFIG.SECRET_KEY.startsWith('sk_live_');
  console.log(`🔑 Using ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'} Secret Key`);
  console.log(`📦 Key: ${CONFIG.SECRET_KEY.substring(0, 15)}...`);
  
  return isProduction;
}

// 获取当前实例配置
async function getCurrentInstance() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.clerk.com',
      port: 443,
      path: '/v1/instance',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${CONFIG.SECRET_KEY}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const instance = JSON.parse(data);
            resolve(instance);
          } catch (error) {
            reject(new Error(`Failed to parse response: ${error.message}`));
          }
        } else {
          reject(new Error(`API request failed with status ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

// 更新允许的 Origins
async function updateAllowedOrigins(currentOrigins = []) {
  // 合并现有 origins 和新的 Tauri origins
  const mergedOrigins = [...new Set([...currentOrigins, ...CONFIG.TAURI_ORIGINS])];
  
  console.log('\n📝 Updating allowed origins...');
  console.log('Current origins:', currentOrigins);
  console.log('Adding Tauri origins:', CONFIG.TAURI_ORIGINS);
  console.log('Final origins:', mergedOrigins);
  
  const payload = {
    allowed_origins: mergedOrigins
  };

  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(payload);
    
    const options = {
      hostname: 'api.clerk.com',
      port: 443,
      path: '/v1/instance',
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${CONFIG.SECRET_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 204) {
          try {
            // 204 No Content 是成功状态，但没有返回数据
            if (res.statusCode === 204) {
              resolve({ message: 'Origins updated successfully', status: 204 });
            } else {
              const result = JSON.parse(data);
              resolve(result);
            }
          } catch (error) {
            reject(new Error(`Failed to parse update response: ${error.message}`));
          }
        } else {
          reject(new Error(`Update request failed with status ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

// 主函数
async function main() {
  try {
    // 1. 验证配置
    const isProduction = validateConfig();
    
    if (isProduction) {
      console.log('⚠️  WARNING: You are configuring PRODUCTION Clerk instance');
      console.log('⏰ Waiting 3 seconds... Press Ctrl+C to cancel');
      await new Promise(resolve => setTimeout(resolve, 3000));
      console.log('🚀 Proceeding with production configuration...\n');
    }
    
    // 2. 获取当前实例配置
    console.log('📡 Fetching current Clerk instance configuration...');
    const currentInstance = await getCurrentInstance();
    
    console.log('✅ Current instance retrieved successfully');
    console.log(`📛 Instance ID: ${currentInstance.id}`);
    console.log(`🌐 Current allowed origins: ${JSON.stringify(currentInstance.allowed_origins || [])}`);
    
    // 3. 更新允许的 origins
    const updatedInstance = await updateAllowedOrigins(currentInstance.allowed_origins || []);
    
    console.log('\n✅ SUCCESS: Clerk origins configured successfully!');
    console.log('📋 Updated Configuration:');
    console.log(`   Instance ID: ${updatedInstance.id}`);
    console.log(`   Allowed Origins: ${JSON.stringify(updatedInstance.allowed_origins, null, 2)}`);
    
    console.log('\n🎉 Tauri app should now be able to authenticate with Clerk!');
    
    // 4. 验证结果
    console.log('\n🔍 Verification:');
    const hasOrigins = CONFIG.TAURI_ORIGINS.every(origin => 
      updatedInstance.allowed_origins.includes(origin)
    );
    
    if (hasOrigins) {
      console.log('✅ All Tauri origins have been added successfully');
    } else {
      console.log('⚠️ Some origins may not have been added correctly');
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.log('\n🛠️ Troubleshooting:');
    console.log('1. Verify your CLERK_SECRET_KEY is correct');
    console.log('2. Ensure you have admin permissions for this Clerk instance');
    console.log('3. Check your network connection');
    console.log('4. Verify the Clerk API is accessible');
    
    process.exit(1);
  }
}

// 帮助信息
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('Clerk Origin Configuration Tool');
  console.log('===============================\n');
  console.log('This tool configures Clerk to allow Tauri application origins.\n');
  console.log('Usage:');
  console.log('  export CLERK_SECRET_KEY=sk_live_your_secret_key');
  console.log('  node scripts/configure-clerk-origins.js\n');
  console.log('Environment Variables:');
  console.log('  CLERK_SECRET_KEY - Your Clerk secret key (required)');
  console.log('                     Development: sk_test_...');
  console.log('                     Production:  sk_live_...\n');
  console.log('Configured Origins:');
  CONFIG.TAURI_ORIGINS.forEach(origin => {
    console.log(`  - ${origin}`);
  });
  process.exit(0);
}

// 运行主函数
main(); 