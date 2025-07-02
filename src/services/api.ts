import { invoke } from "@tauri-apps/api/core";
import axios, { AxiosInstance } from "axios";
import { getClashInfo } from "./cmds";

let instancePromise: Promise<AxiosInstance> = null!;

async function getInstancePromise() {
  let server = "";
  let secret = "";

  try {
    const info = await getClashInfo();

    if (info?.server) {
      server = info.server;

      // compatible width `external-controller`
      if (server.startsWith(":")) server = `127.0.0.1${server}`;
      else if (/^\d+$/.test(server)) server = `127.0.0.1:${server}`;
    }
    if (info?.secret) secret = info?.secret;
  } catch {}

  const axiosIns = axios.create({
    baseURL: `http://${server}`,
    headers: secret ? { Authorization: `Bearer ${secret}` } : {},
    timeout: 15000,
  });
  axiosIns.interceptors.response.use((r) => r.data);
  return axiosIns;
}

/// initialize some information
/// enable force update axiosIns
export const getAxios = async (force: boolean = false) => {
  if (!instancePromise || force) {
    instancePromise = getInstancePromise();
  }
  return instancePromise;
};

/// Get Version
export const getVersion = async () => {
  const instance = await getAxios();
  return instance.get("/version") as Promise<{
    premium: boolean;
    meta?: boolean;
    version: string;
  }>;
};

/// Get current base configs
export const getClashConfig = async () => {
  const instance = await getAxios();
  return instance.get("/configs") as Promise<IConfigData>;
};

/// Update geo data
export const updateGeoData = async () => {
  const instance = await getAxios();
  return instance.post("/configs/geo");
};

/// Upgrade clash core
export const upgradeCore = async () => {
  const instance = await getAxios();
  return instance.post("/upgrade");
};

/// Get current rules
export const getRules = async () => {
  const instance = await getAxios();
  const response = await instance.get<any, any>("/rules");
  return response?.rules as IRuleItem[];
};

/// Get Proxy delay
export const getProxyDelay = async (
  name: string,
  url?: string,
  timeout?: number,
) => {
  const params = {
    timeout: timeout || 10000,
    url: url || "http://cp.cloudflare.com/generate_204",
  };
  const instance = await getAxios();
  const result = await instance.get(
    `/proxies/${encodeURIComponent(name)}/delay`,
    { params },
  );
  return result as any as { delay: number };
};

/// Update the Proxy Choose
export const updateProxy = async (group: string, proxy: string) => {
  const instance = await getAxios();
  return instance.put(`/proxies/${encodeURIComponent(group)}`, { name: proxy });
};

// get proxy
export const getProxiesInner = async () => {
  const response = await invoke<{ proxies: Record<string, IProxyItem> }>(
    "get_proxies",
  );
  return response.proxies as Record<string, IProxyItem>;
};

/// Get the Proxy information
export const getProxies = async (): Promise<{
  global: IProxyGroupItem;
  direct: IProxyItem;
  groups: IProxyGroupItem[];
  records: Record<string, IProxyItem>;
  proxies: IProxyItem[];
}> => {
  const [proxyRecord, providerRecord] = await Promise.all([
    getProxiesInner(),
    getProxyProviders(),
  ]);
  // provider name map
  const providerMap = Object.fromEntries(
    Object.entries(providerRecord).flatMap(([provider, item]) =>
      item.proxies.map((p) => [p.name, { ...p, provider }]),
    ),
  );

  // compatible with proxy-providers
  const generateItem = (name: string) => {
    if (proxyRecord[name]) return proxyRecord[name];
    if (providerMap[name]) return providerMap[name];
    return {
      name,
      type: "unknown",
      udp: false,
      xudp: false,
      tfo: false,
      mptcp: false,
      smux: false,
      history: [],
    };
  };

  const { GLOBAL: global, DIRECT: direct, REJECT: reject } = proxyRecord;

  let groups: IProxyGroupItem[] = Object.values(proxyRecord).reduce<
    IProxyGroupItem[]
  >((acc, each) => {
    if (each.name !== "GLOBAL" && each.all) {
      acc.push({
        ...each,
        all: each.all!.map((item) => generateItem(item)),
      });
    }

    return acc;
  }, []);

  if (global?.all) {
    let globalGroups: IProxyGroupItem[] = global.all.reduce<IProxyGroupItem[]>(
      (acc, name) => {
        if (proxyRecord[name]?.all) {
          acc.push({
            ...proxyRecord[name],
            all: proxyRecord[name].all!.map((item) => generateItem(item)),
          });
        }
        return acc;
      },
      [],
    );

    let globalNames = new Set(globalGroups.map((each) => each.name));
    groups = groups
      .filter((group) => {
        return !globalNames.has(group.name);
      })
      .concat(globalGroups);
  }

  const proxies = [direct, reject].concat(
    Object.values(proxyRecord).filter(
      (p) => !p.all?.length && p.name !== "DIRECT" && p.name !== "REJECT",
    ),
  );

  const _global: IProxyGroupItem = {
    ...global,
    all: global?.all?.map((item) => generateItem(item)) || [],
  };

  return { global: _global, direct, groups, records: proxyRecord, proxies };
};

// get proxy providers
export const getProxyProviders = async () => {
  const response = await invoke<{
    providers: Record<string, IProxyProviderItem>;
  }>("get_providers_proxies");
  const providers = response.providers as Record<string, IProxyProviderItem>;

  return Object.fromEntries(
    Object.entries(providers).filter(([key, item]) => {
      const type = item.vehicleType.toLowerCase();
      return type === "http" || type === "file";
    }),
  );
};

export const getRuleProviders = async () => {
  const instance = await getAxios();
  const response = await instance.get<any, any>("/providers/rules");

  const providers = (response.providers || {}) as Record<
    string,
    IRuleProviderItem
  >;

  return Object.fromEntries(
    Object.entries(providers).filter(([key, item]) => {
      const type = item.vehicleType.toLowerCase();
      return type === "http" || type === "file";
    }),
  );
};

// proxy providers health check
export const providerHealthCheck = async (name: string) => {
  const instance = await getAxios();
  return instance.get(
    `/providers/proxies/${encodeURIComponent(name)}/healthcheck`,
  );
};

export const proxyProviderUpdate = async (name: string) => {
  const instance = await getAxios();
  return instance.put(`/providers/proxies/${encodeURIComponent(name)}`);
};

export const ruleProviderUpdate = async (name: string) => {
  const instance = await getAxios();
  return instance.put(`/providers/rules/${encodeURIComponent(name)}`);
};

export const getConnections = async () => {
  const instance = await getAxios();
  const result = await instance.get("/connections");
  return result as any as IConnections;
};

// Close specific connection
export const deleteConnection = async (id: string) => {
  const instance = await getAxios();
  await instance.delete<any, any>(`/connections/${encodeURIComponent(id)}`);
};

// Close all connections
export const closeAllConnections = async () => {
  const instance = await getAxios();
  await instance.delete("/connections");
};

// Get Group Proxy Delays
export const getGroupProxyDelays = async (
  groupName: string,
  url?: string,
  timeout?: number,
) => {
  const params = {
    timeout: timeout || 10000,
    url: url || "http://cp.cloudflare.com/generate_204",
  };

  console.log(
    `[API] 获取代理组延迟，组: ${groupName}, URL: ${params.url}, 超时: ${params.timeout}ms`,
  );

  try {
    const instance = await getAxios();
    console.log(
      `[API] 发送HTTP请求: GET /group/${encodeURIComponent(groupName)}/delay`,
    );

    const result = await instance.get(
      `/group/${encodeURIComponent(groupName)}/delay`,
      { params },
    );

    console.log(
      `[API] 获取代理组延迟成功，组: ${groupName}, 结果数量:`,
      Object.keys(result || {}).length,
    );
    return result as any as Record<string, number>;
  } catch (error) {
    console.error(`[API] 获取代理组延迟失败，组: ${groupName}`, error);
    throw error;
  }
};

// Is debug enabled
export const isDebugEnabled = async () => {
  try {
    const instance = await getAxios();
    await instance.get("/debug/pprof");
    return true;
  } catch {
    return false;
  }
};

// GC
export const gc = async () => {
  try {
    const instance = await getAxios();
    await instance.put("/debug/gc");
  } catch (error) {
    console.error(`Error gcing: ${error}`);
  }
};

// Get current IP and geolocation information
export const getIpInfo = async () => {
  // 使用axios直接请求IP.sb的API，不通过clash代理
  const response = await axios.get("https://api.ip.sb/geoip");
  return response.data as {
    ip: string;
    country_code: string;
    country: string;
    region: string;
    city: string;
    organization: string;
    asn: number;
    asn_organization: string;
    longitude: number;
    latitude: number;
    timezone: string;
  };
};

// 环境检测和API配置
const getEnvironment = () => {
  // 强化的环境检测逻辑
  const isTauriApp = typeof window !== 'undefined' && (window as any).__TAURI__;
  const isViteDev = import.meta.env.DEV === true;
  const isModeDevelpment = import.meta.env.MODE === 'development';
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const isDevPort = window.location.port === '9097';
  
  // 在Tauri应用中，优先检查Vite环境变量
  // 如果是Tauri应用且不是明确的开发模式，则视为生产环境
  const isDevelopment = isTauriApp 
    ? (isViteDev || isModeDevelpment)  // Tauri中只看Vite变量
    : (isViteDev || isModeDevelpment || isLocalhost || isDevPort);  // 浏览器中检查所有条件
  
  return {
    isDevelopment,
    isProduction: !isDevelopment,
    isTauriApp,
    isViteDev,
    isModeDevelpment,
    isLocalhost,
    isDevPort
  };
};

const getApiBaseUrl = () => {
  const { isDevelopment } = getEnvironment();
  
  // 优先使用环境变量设置的URL
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  
  // 根据环境自动选择URL
  if (isDevelopment) {
    // 开发环境使用localhost
    return 'http://localhost:8080';
  } else {
    // 生产环境使用远程服务器
    return 'https://api.101proxy.top';
  }
};

// 添加认证相关的 API 配置
export const AUTH_API_CONFIG = {
  baseURL: getApiBaseUrl(),
  timeout: 10000,
  endpoints: {
    login: '/api/auth/login',
    refresh: '/api/auth/refresh',
    logout: '/api/auth/logout'
  }
};

// 导出环境信息供其他模块使用
export const ENVIRONMENT = getEnvironment();

// 调试信息
console.log('🌍 Environment detected:', {
  isDevelopment: ENVIRONMENT.isDevelopment,
  isProduction: ENVIRONMENT.isProduction,
  isTauriApp: ENVIRONMENT.isTauriApp,
  isViteDev: ENVIRONMENT.isViteDev,
  isModeDevelpment: ENVIRONMENT.isModeDevelpment,
  isLocalhost: ENVIRONMENT.isLocalhost,
  isDevPort: ENVIRONMENT.isDevPort,
  apiBaseUrl: AUTH_API_CONFIG.baseURL,
  hostname: window.location.hostname,
  port: window.location.port,
  viteModeEnv: import.meta.env.MODE,
  viteDevEnv: import.meta.env.DEV
});
