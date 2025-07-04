import { default as iconDark, default as iconLight } from "@/assets/image/logo.svg?react";
import { Notice } from "@/components/base";
import { LayoutControl } from "@/components/layout/layout-control";
import { LayoutItem } from "@/components/layout/layout-item";
import { LayoutTraffic } from "@/components/layout/layout-traffic";
import { useCustomTheme } from "@/components/layout/use-custom-theme";
import { useClashInfo } from "@/hooks/use-clash";
import { useListen } from "@/hooks/use-listen";
import { useTrafficMonitor } from "@/hooks/use-traffic-monitor";
import { useVerge } from "@/hooks/use-verge";
import { useAuth } from "@/providers/auth-provider";
import { getAxios } from "@/services/api";
import { useThemeMode } from "@/services/states";
import getSystem from "@/utils/get-system";
import { LogoutRounded } from "@mui/icons-material";
import { Box, Button, Divider, List, Paper, SvgIcon, ThemeProvider, Typography } from "@mui/material";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import dayjs from "dayjs";
import "dayjs/locale/ru";
import "dayjs/locale/zh-cn";
import relativeTime from "dayjs/plugin/relativeTime";
import i18next from "i18next";
import React, { useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate, useRoutes } from "react-router-dom";
import { CSSTransition, TransitionGroup } from "react-transition-group";
import { SWRConfig, mutate } from "swr";
import { protectedRoutes, routers } from "./_routers";

const appWindow = getCurrentWebviewWindow();
export let portableFlag = false;

dayjs.extend(relativeTime);

const OS = getSystem();

// 通知处理函数
const handleNoticeMessage = (
  status: string,
  msg: string,
  t: (key: string) => string,
  navigate: (path: string, options?: any) => void,
) => {
  console.log("[通知监听] 收到消息:", status, msg);

  switch (status) {
    case "import_sub_url::ok":
      navigate("/profile", { state: { current: msg } });
      Notice.success(t("Import Subscription Successful"));
      break;
    case "import_sub_url::error":
      navigate("/profile");
      Notice.error(msg);
      break;
    case "set_config::error":
      Notice.error(msg);
      break;
    case "config_validate::boot_error":
      Notice.error(`${t("Boot Config Validation Failed")} ${msg}`);
      break;
    case "config_validate::core_change":
      Notice.error(`${t("Core Change Config Validation Failed")} ${msg}`);
      break;
    case "config_validate::error":
      Notice.error(`${t("Config Validation Failed")} ${msg}`);
      break;
    case "config_validate::process_terminated":
      Notice.error(t("Config Validation Process Terminated"));
      break;
    case "config_validate::stdout_error":
      Notice.error(`${t("Config Validation Failed")} ${msg}`);
      break;
    case "config_validate::script_error":
      Notice.error(`${t("Script File Error")} ${msg}`);
      break;
    case "config_validate::script_syntax_error":
      Notice.error(`${t("Script Syntax Error")} ${msg}`);
      break;
    case "config_validate::script_missing_main":
      Notice.error(`${t("Script Missing Main")} ${msg}`);
      break;
    case "config_validate::file_not_found":
      Notice.error(`${t("File Not Found")} ${msg}`);
      break;
    case "config_validate::yaml_syntax_error":
      Notice.error(`${t("YAML Syntax Error")} ${msg}`);
      break;
    case "config_validate::yaml_read_error":
      Notice.error(`${t("YAML Read Error")} ${msg}`);
      break;
    case "config_validate::yaml_mapping_error":
      Notice.error(`${t("YAML Mapping Error")} ${msg}`);
      break;
    case "config_validate::yaml_key_error":
      Notice.error(`${t("YAML Key Error")} ${msg}`);
      break;
    case "config_validate::yaml_error":
      Notice.error(`${t("YAML Error")} ${msg}`);
      break;
    case "config_validate::merge_syntax_error":
      Notice.error(`${t("Merge File Syntax Error")} ${msg}`);
      break;
    case "config_validate::merge_mapping_error":
      Notice.error(`${t("Merge File Mapping Error")} ${msg}`);
      break;
    case "config_validate::merge_key_error":
      Notice.error(`${t("Merge File Key Error")} ${msg}`);
      break;
    case "config_validate::merge_error":
      Notice.error(`${t("Merge File Error")} ${msg}`);
      break;
    case "config_core::change_success":
      Notice.success(`${t("Core Changed Successfully")}: ${msg}`);
      break;
    case "config_core::change_error":
      Notice.error(`${t("Failed to Change Core")}: ${msg}`);
      break;
  }
};

const Layout = () => {
  const mode = useThemeMode();
  const isDark = mode === "light" ? false : true;
  const { t } = useTranslation();
  const { theme } = useCustomTheme();
  const { verge } = useVerge();
  const { clashInfo } = useClashInfo();
  const { language, start_page } = verge ?? {};
  const navigate = useNavigate();
  const location = useLocation();
  const routersEles = useRoutes(routers);
  const { addListener, setupCloseListener } = useListen();
  const { isSignedIn, signOut } = useAuth();

  // 初始化独立的流量监控（后台运行，不影响UI）
  const { resetTrafficStats } = useTrafficMonitor();

  // 判断是否为登录页面
  const isLoginPage = location.pathname === "/login";

  // 退出登录处理
  const handleLogout = () => {
    // 重置流量统计
    resetTrafficStats();
    signOut();
    navigate("/login");
    Notice.info(t("Logged out successfully"));
  };

  const handleNotice = useCallback(
    (payload: [string, string]) => {
      const [status, msg] = payload;
      handleNoticeMessage(status, msg, t, navigate);
    },
    [t, navigate],
  );

  // 设置监听器
  useEffect(() => {
    const listeners = [
      // 配置更新监听
      addListener("verge://refresh-clash-config", async () => {
        await getAxios(true);
        mutate("getProxies");
        mutate("getVersion");
        mutate("getClashConfig");
        mutate("getProxyProviders");
      }),

      // verge 配置更新监听
      addListener("verge://refresh-verge-config", () => {
        mutate("getVergeConfig");
        // 添加对系统代理状态的刷新
        mutate("getSystemProxy");
        mutate("getAutotemProxy");
      }),

      // 通知消息监听
      addListener("verge://notice-message", ({ payload }) =>
        handleNotice(payload as [string, string]),
      ),
    ];

    // 设置窗口显示/隐藏监听
    const setupWindowListeners = async () => {
      const [hideUnlisten, showUnlisten] = await Promise.all([
        listen("verge://hide-window", () => appWindow.hide()),
        listen("verge://show-window", () => appWindow.show()),
      ]);

      return () => {
        hideUnlisten();
        showUnlisten();
      };
    };

    // 初始化
    setupCloseListener();
    const cleanupWindow = setupWindowListeners();

    // 清理函数
    return () => {
      // 清理主要监听器
      listeners.forEach((listener) => {
        if (typeof listener.then === "function") {
          listener.then((unlisten) => unlisten());
        }
      });
      // 清理窗口监听器
      cleanupWindow.then((cleanup) => cleanup());
    };
  }, [handleNotice]);

  // 监听启动完成事件并通知UI已加载
  useEffect(() => {
    const notifyUiReady = async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 200));
        await invoke("notify_ui_ready");
        console.log("已通知后端UI准备就绪");
      } catch (err) {
        console.error("通知UI准备就绪失败:", err);
      }
    };

    // 监听后端发送的启动完成事件
    const listenStartupCompleted = async () => {
      const unlisten = await listen("verge://startup-completed", () => {
        console.log("收到启动完成事件");
      });
      return unlisten;
    };

    notifyUiReady();
    const unlistenPromise = listenStartupCompleted();

    return () => {
      unlistenPromise.then(unlisten => unlisten());
    };
  }, []);

  // 语言和起始页设置
  useEffect(() => {
    if (language) {
      dayjs.locale(language === "zh" ? "zh-cn" : language);
      i18next.changeLanguage(language);
    }
  }, [language]);

  useEffect(() => {
    if (start_page) {
      navigate(start_page, { replace: true });
    }
  }, [start_page]);

  if (!routersEles) return null;

  return (
    <SWRConfig value={{ errorRetryCount: 3 }}>
      <ThemeProvider theme={theme}>
        <Paper
          square
          elevation={0}
          className={`${OS} layout ${isLoginPage ? 'login-page' : ''}`}
          onContextMenu={(e) => {
            if (
              OS === "windows" &&
              !["input", "textarea"].includes(
                e.currentTarget.tagName.toLowerCase(),
              ) &&
              !e.currentTarget.isContentEditable
            ) {
              e.preventDefault();
            }
          }}
          sx={[
            ({ palette }) => ({ bgcolor: palette.background.paper }),
            OS === "linux"
              ? {
                  borderRadius: "8px",
                  border: "1px solid var(--divider-color)",
                  width: "calc(100vw - 4px)",
                  height: "calc(100vh - 4px)",
                }
              : {},
          ]}
        >
          {/* 只在非登录页面且已登录时显示左侧导航 */}
          {!isLoginPage && (
            <div className="layout__left">
              <div className="the-logo" data-tauri-drag-region="true">
                <div style={{ 
                  display: "flex", 
                  justifyContent: "center", 
                  alignItems: "center", 
                  flexDirection: "column",
                  height: "100%", 
                  width: "100%" 
                }}>
                  <SvgIcon
                    component={isDark ? iconDark : iconLight}
                    style={{
                      height: "80px",
                      width: "80px",
                    }}
                    inheritViewBox
                  />
                  <Typography 
                    variant="subtitle1" 
                    sx={{ 
                      mt: 1, 
                      fontWeight: "bold",
                      color: theme => theme.palette.text.primary
                    }}
                  >
                    YI0YI-加速器
                  </Typography>
                </div>
              </div>

              {isSignedIn && (
                <>
                  <List className="the-menu">
                    {protectedRoutes
                      .filter(router => router.label && router.icon)
                      .map((router) => (
                        <LayoutItem
                          key={router.label}
                          to={router.path}
                          icon={router.icon || []}
                        >
                          {t(router.label || "")}
                        </LayoutItem>
                      ))}
                  </List>

                  <div className="the-traffic">
                    <LayoutTraffic />
                  </div>
                  
                  {/* 添加底部的退出登录按钮 */}
                  <Box className="the-logout">
                    <Divider sx={{ my: 1 }} />
                    <Button
                      fullWidth
                      variant="outlined"
                      color="inherit"
                      onClick={handleLogout}
                      startIcon={<LogoutRounded />}
                      sx={{
                        justifyContent: "flex-start",
                        pl: 3,
                        borderRadius: 1.5,
                      }}
                    >
                      {t("Logout")}
                    </Button>
                  </Box>
                </>
              )}
            </div>
          )}

          <div className={`layout__right ${isLoginPage ? 'full-width' : ''}`}>
            <div className="the-bar">
              <div
                className="the-dragbar"
                data-tauri-drag-region="true"
                style={{ width: "100%" }}
              />
              {OS !== "macos" && <LayoutControl />}
            </div>

            <TransitionGroup className="the-content">
              <CSSTransition
                key={location.pathname}
                timeout={300}
                classNames="page"
              >
                {React.cloneElement(routersEles, { key: location.pathname })}
              </CSSTransition>
            </TransitionGroup>
          </div>
        </Paper>
      </ThemeProvider>
    </SWRConfig>
  );
};

export default Layout;
