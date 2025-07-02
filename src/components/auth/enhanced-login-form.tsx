import { useAuth } from "@/providers/auth-provider";
import authService, { LoginCredentials } from "@/services/auth-service";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  IconButton,
  InputAdornment,
  TextField,
  Tooltip,
  Typography,
  useTheme
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

interface EnhancedLoginFormProps {
  onSuccess?: () => void;
}

// 简单的加密/解密工具函数
const encryptPassword = (password: string): string => {
  // 简单的Base64加密（仅用于基本混淆，不是真正的安全加密）
  return btoa(unescape(encodeURIComponent(password + "yi0yi_salt")));
};

const decryptPassword = (encryptedPassword: string): string => {
  try {
    const decoded = decodeURIComponent(escape(atob(encryptedPassword)));
    return decoded.replace("yi0yi_salt", "");
  } catch {
    return "";
  }
};

// 本地存储keys
const STORAGE_KEYS = {
  EMAIL: "yi0yi_remembered_email",
  PASSWORD: "yi0yi_remembered_password",
  REMEMBER_ME: "yi0yi_remember_me"
};

export const EnhancedLoginForm: React.FC<EnhancedLoginFormProps> = ({ onSuccess }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigate = useNavigate();
  const { refreshAuth, isSignedIn } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const loginInProgress = useRef(false);
  
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  // 组件加载时读取保存的账号密码
  useEffect(() => {
    const loadSavedCredentials = () => {
      try {
        const savedEmail = localStorage.getItem(STORAGE_KEYS.EMAIL);
        const savedPassword = localStorage.getItem(STORAGE_KEYS.PASSWORD);
        const savedRememberMe = localStorage.getItem(STORAGE_KEYS.REMEMBER_ME) === "true";

        if (savedRememberMe && savedEmail) {
          setRememberMe(true);
          setFormData(prev => ({
            ...prev,
            email: savedEmail,
            password: savedPassword ? decryptPassword(savedPassword) : ""
          }));
          console.log("✅ 已加载保存的登录凭据");
        }
      } catch (error) {
        console.warn("⚠️ 加载保存的凭据失败:", error);
      }
    };

    loadSavedCredentials();
  }, []);

  // 保存或清除凭据
  const saveCredentials = (email: string, password: string, remember: boolean) => {
    try {
      if (remember) {
        localStorage.setItem(STORAGE_KEYS.EMAIL, email);
        localStorage.setItem(STORAGE_KEYS.PASSWORD, encryptPassword(password));
        localStorage.setItem(STORAGE_KEYS.REMEMBER_ME, "true");
        console.log("✅ 已保存登录凭据");
      } else {
        localStorage.removeItem(STORAGE_KEYS.EMAIL);
        localStorage.removeItem(STORAGE_KEYS.PASSWORD);
        localStorage.removeItem(STORAGE_KEYS.REMEMBER_ME);
        console.log("✅ 已清除保存的凭据");
      }
    } catch (error) {
      console.warn("⚠️ 保存凭据失败:", error);
    }
  };

  // 监听认证状态变化，处理登录成功后的跳转
  useEffect(() => {
    if (isSignedIn && loginInProgress.current) {
      console.warn('✅ 认证状态已更新，重定向到首页');
      loginInProgress.current = false;
      navigate("/home", { replace: true });
      onSuccess?.();
    } else if (isSignedIn && !loginInProgress.current) {
      // 用户已经登录，直接跳转
      console.warn('✅ 用户已登录，重定向到首页');
      navigate("/home", { replace: true });
    }
  }, [isSignedIn, navigate, onSuccess]);

  const handleInputChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
    // Clear error when user starts typing
    if (error) setError("");
  };

  const handleRememberMeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const checked = event.target.checked;
    setRememberMe(checked);
    
    // 如果用户取消勾选，立即清除已保存的凭据
    if (!checked) {
      saveCredentials("", "", false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!formData.email || !formData.password) {
      setError(t("Please fill in all required fields"));
      return;
    }

    setLoading(true);
    setError("");
    loginInProgress.current = true;

    try {
      console.warn('🚀 Starting login...');
      
      const credentials: LoginCredentials = {
        email: formData.email,
        password: formData.password
      };
      
      await authService.completeLogin(credentials);
      
      console.warn('🎉 Login successful!');
      
      // 根据用户选择保存或清除凭据
      saveCredentials(formData.email, formData.password, rememberMe);
      
      // 重要：更新 AuthProvider 状态，让 useEffect 处理跳转
      console.warn('🔄 Refreshing auth state...');
      const authRefreshResult = await refreshAuth();
      console.warn('✅ Auth refresh completed:', authRefreshResult);
      
    } catch (err: any) {
      console.error("💥 Login error:", err);
      setError(err?.message || t("Authentication failed"));
      loginInProgress.current = false;
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{
        width: "100%",
        maxWidth: 500,
        p: 4,
        borderRadius: 2,
        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        backgroundColor: alpha(theme.palette.background.paper, 0.8),
        backdropFilter: "blur(8px)",
        boxShadow: "none",
      }}
    >
      {/* Header */}
      <Box sx={{ mb: 3, textAlign: "center" }}>
        <Typography
          variant="h4"
          component="h1"
          sx={{ fontWeight: 600, mb: 1 }}
        >
          {t("Welcome Back")}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t("Sign in to your account to continue")}
        </Typography>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Email Field */}
      <TextField
        fullWidth
        label={t("Email Address")}
        type="email"
        value={formData.email}
        onChange={handleInputChange("email")}
        margin="normal"
        required
        disabled={loading}
        autoComplete="email"
      />

      {/* Password Field */}
      <TextField
        fullWidth
        label={t("Password")}
        type={showPassword ? "text" : "password"}
        value={formData.password}
        onChange={handleInputChange("password")}
        margin="normal"
        required
        disabled={loading}
        autoComplete="current-password"
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                onClick={togglePasswordVisibility}
                disabled={loading}
                edge="end"
              >
                {showPassword ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </InputAdornment>
          ),
        }}
      />

      {/* Remember Me Checkbox */}
      <Tooltip 
        title={t("Your credentials will be securely saved on this device for easier login")}
        arrow
        placement="top"
      >
        <FormControlLabel
          control={
            <Checkbox
              checked={rememberMe}
              onChange={handleRememberMeChange}
              disabled={loading}
              color="primary"
            />
          }
          label={t("Remember account and password")}
          sx={{ 
            mt: 1, 
            mb: 2,
            '& .MuiFormControlLabel-label': {
              fontSize: '0.875rem',
              color: 'text.secondary'
            }
          }}
        />
      </Tooltip>

      {/* Submit Button */}
      <Button
        type="submit"
        fullWidth
        variant="contained"
        size="large"
        disabled={loading}
        sx={{
          mt: 1,
          mb: 2,
          py: 1.5,
          backgroundColor: theme.palette.primary.main,
          "&:hover": {
            backgroundColor: theme.palette.primary.dark,
          },
        }}
      >
        {loading ? t("Signing in...") : t("Sign In")}
      </Button>

      {/* Footer Info */}
      <Box sx={{ mt: 2 }}>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center' }}>
          {t("Enter your email and password to sign in")}
        </Typography>
      </Box>
    </Box>
  );
}; 