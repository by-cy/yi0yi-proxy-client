import { useAuth } from "@/providers/auth-provider";
import authService, { LoginCredentials } from "@/services/auth-service";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  IconButton,
  InputAdornment,
  TextField,
  Typography,
  useTheme,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

interface EnhancedLoginFormProps {
  onSuccess?: () => void;
}

export const EnhancedLoginForm: React.FC<EnhancedLoginFormProps> = ({ onSuccess }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigate = useNavigate();
  const { refreshAuth, isSignedIn } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [showPassword, setShowPassword] = useState(false);
  const loginInProgress = useRef(false);
  
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

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
      
      // 重要：更新 AuthProvider 状态，让 useEffect 处理跳转
      console.warn('🔄 Refreshing auth state...');
      refreshAuth();
      
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

      {/* Submit Button */}
      <Button
        type="submit"
        fullWidth
        variant="contained"
        size="large"
        disabled={loading}
        sx={{
          mt: 3,
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