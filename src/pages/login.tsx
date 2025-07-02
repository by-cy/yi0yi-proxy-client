import LogoSvg from "@/assets/image/logo.svg?react";
import { EnhancedLoginForm } from "@/components/auth/enhanced-login-form";
import { patchVergeConfig } from "@/services/cmds";
import { Box, SvgIcon, Typography, useTheme } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

const LoginPage: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();

  useEffect(() => {
    console.log("Login page mounted");
    
    // 在Login界面初始化时确保系统代理是关闭的
    const initializeSystemProxy = async () => {
      try {
        console.log('🔌 Login页面初始化 - 正在关闭系统代理...');
        await patchVergeConfig({ enable_system_proxy: false });
        console.log('✅ 系统代理已关闭');
      } catch (error) {
        console.warn('⚠️ 关闭系统代理失败:', error);
        // 即使失败也不影响用户登录
      }
    };
    
    initializeSystemProxy();
  }, []);

  return (
    <Box
      sx={{
        height: "100vh",
        width: "100vw",
        display: "flex",
        overflow: "hidden",
        position: "relative",
        bgcolor: "background.default",
      }}
    >
      {/* 左侧装饰区域 */}
      <Box
        sx={{
          width: { xs: 0, md: "45%" },
          height: "100%",
          display: { xs: "none", md: "flex" },
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          bgcolor: theme.palette.primary.main,
          color: theme.palette.primary.contrastText,
          overflow: "hidden",
        }}
      >
        {/* 装饰性背景图形 */}
        <Box
          sx={{
            position: "absolute",
            width: "160%",
            height: "160%",
            top: "-30%",
            left: "-30%",
            borderRadius: "50%",
            background: `radial-gradient(circle, ${alpha(theme.palette.primary.light, 0.3)} 0%, transparent 70%)`,
          }}
        />
        <Box
          sx={{
            position: "absolute",
            width: "120%",
            height: "120%",
            bottom: "-20%",
            right: "-20%",
            borderRadius: "50%",
            background: `radial-gradient(circle, ${alpha(theme.palette.primary.dark, 0.3)} 0%, transparent 70%)`,
          }}
        />
        
        {/* 左侧内容 */}
        <Box
          sx={{
            zIndex: 1,
            textAlign: "center",
            p: 5,
            maxWidth: "80%",
          }}
        >
          <Box sx={{ mb: 4 }}>
            <SvgIcon
              component={LogoSvg}
              sx={{
                height: 110,
                width: 110,
                mb: 2,
              }}
              inheritViewBox
            />
            <Typography
              variant="h3"
              component="h1"
              sx={{
                fontWeight: 700,
                mb: 1,
              }}
            >
              YI0YI-加速器
            </Typography>
            <Typography variant="h6" sx={{ opacity: 0.8 }}>
              {t("Next-generation proxy client")}
            </Typography>
          </Box>
          
          <Typography 
            variant="body1" 
            sx={{ 
              mt: 4,
              opacity: 0.9,
              fontStyle: "italic"
            }}
          >
            {t("Secure. Fast. Reliable.")}
          </Typography>
        </Box>
        
        {/* 版权信息 */}
        <Typography 
          variant="body2" 
          sx={{ 
            position: "absolute",
            bottom: 16,
            opacity: 0.7,
          }}
        >
          © {new Date().getFullYear()} YI0YI-加速器
        </Typography>
      </Box>
      
      {/* 右侧登录表单区域 */}
      <Box
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          p: { xs: 2, sm: 4 },
        }}
      >
        {/* 移动设备上显示的Logo */}
        <Box
          sx={{
            display: { xs: "flex", md: "none" },
            flexDirection: "column",
            alignItems: "center",
            mb: 5,
          }}
        >
          <SvgIcon
            component={LogoSvg}
            sx={{
              height: 70,
              width: 70,
              mb: 1,
            }}
            inheritViewBox
          />
          <Typography variant="h4" sx={{ fontWeight: 600 }}>
            YI0YI-加速器
          </Typography>
        </Box>
        
        {/* 自定义登录表单 */}
        <EnhancedLoginForm />
        
        {/* 移动设备上的版权信息 */}
        <Typography 
          variant="body2" 
          color="text.secondary" 
          align="center" 
          sx={{ 
            mt: 4,
            display: { xs: "block", md: "none" }
          }}
        >
          © {new Date().getFullYear()} YI0YI-加速器
        </Typography>
      </Box>
    </Box>
  );
};

export default LoginPage; 