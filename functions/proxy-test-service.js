/**
 * 代理测试服务配置
 * 用于管理代理延迟测试的各种配置和工具函数
 */

// 测试服务配置
export const TEST_CONFIG = {
  // 超时设置
  TIMEOUT: 10000, // 10秒
  CONNECT_TIMEOUT: 5000, // 5秒连接超时
  
  // 测试URL列表
  TEST_URLS: [
    'http://www.google.com/generate_204',
    'https://httpbin.org/delay/1',
    'https://www.cloudflare.com/cdn-cgi/trace',
    'https://www.baidu.com/favicon.ico'
  ],
  
  // 重试配置
  MAX_RETRIES: 2,
  RETRY_DELAY: 1000, // 1秒
  
  // 并发限制
  MAX_CONCURRENT: 5,
  
  // 用户代理
  USER_AGENTS: [
    'MiSub-Proxy-Test/1.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Clash for Windows/0.20.39'
  ]
};

// 代理协议支持
export const SUPPORTED_PROTOCOLS = {
  VMESS: 'vmess',
  VLESS: 'vless',
  TROJAN: 'trojan',
  SHADOWSOCKS: 'ss',
  SHADOWSOCKSR: 'ssr'
};

// 延迟分类标准
export const LATENCY_STANDARDS = {
  EXCELLENT: 50,   // 极佳 < 50ms
  GOOD: 100,       // 优秀 < 100ms
  FAIR: 150,       // 良好 < 150ms
  POOR: 200,       // 一般 < 200ms
  BAD: 300,        // 较差 < 300ms
  // > 300ms 很差
};

/**
 * 获取延迟等级
 * @param {number} latency - 延迟值(ms)
 * @returns {string} 延迟等级
 */
export function getLatencyLevel(latency) {
  if (latency === -1) return 'timeout';
  if (latency < LATENCY_STANDARDS.EXCELLENT) return 'excellent';
  if (latency < LATENCY_STANDARDS.GOOD) return 'good';
  if (latency < LATENCY_STANDARDS.FAIR) return 'fair';
  if (latency < LATENCY_STANDARDS.POOR) return 'poor';
  if (latency < LATENCY_STANDARDS.BAD) return 'bad';
  return 'terrible';
}

/**
 * 获取延迟颜色类名
 * @param {number} latency - 延迟值(ms)
 * @returns {string} Tailwind CSS类名
 */
export function getLatencyColorClass(latency) {
  const level = getLatencyLevel(latency);
  const colors = {
    excellent: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400',
    good: 'bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400',
    fair: 'bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
    poor: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400',
    bad: 'bg-orange-100 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400',
    terrible: 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400',
    timeout: 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400'
  };
  return colors[level] || colors.timeout;
}

/**
 * 解析代理URL
 * @param {string} nodeUrl - 代理节点URL
 * @returns {Object|null} 解析后的代理配置
 */
export function parseProxyUrl(nodeUrl) {
  try {
    if (nodeUrl.startsWith('vmess://')) {
      return parseVmessUrl(nodeUrl);
    } else if (nodeUrl.startsWith('vless://')) {
      return parseVlessUrl(nodeUrl);
    } else if (nodeUrl.startsWith('trojan://')) {
      return parseTrojanUrl(nodeUrl);
    } else if (nodeUrl.startsWith('ss://')) {
      return parseShadowsocksUrl(nodeUrl);
    } else if (nodeUrl.startsWith('ssr://')) {
      return parseShadowsocksRUrl(nodeUrl);
    }
    return null;
  } catch (error) {
    console.error('解析代理URL失败:', error);
    return null;
  }
}

/**
 * 解析VMess URL
 */
function parseVmessUrl(nodeUrl) {
  const base64Part = nodeUrl.substring('vmess://'.length);
  const binaryString = atob(base64Part);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  const jsonString = new TextDecoder('utf-8').decode(bytes);
  const vmessConfig = JSON.parse(jsonString);
  
  return {
    type: SUPPORTED_PROTOCOLS.VMESS,
    server: vmessConfig.add,
    port: vmessConfig.port,
    uuid: vmessConfig.id,
    alterId: vmessConfig.aid || 0,
    security: vmessConfig.scy || 'auto',
    network: vmessConfig.net || 'tcp',
    wsPath: vmessConfig.path || '',
    wsHeaders: vmessConfig.host ? { Host: vmessConfig.host } : {},
    tls: vmessConfig.tls === 'tls',
    sni: vmessConfig.sni || vmessConfig.host,
    name: vmessConfig.ps || 'VMess节点'
  };
}

/**
 * 解析VLess URL
 */
function parseVlessUrl(nodeUrl) {
  const url = new URL(nodeUrl);
  const params = new URLSearchParams(url.search);
  
  return {
    type: SUPPORTED_PROTOCOLS.VLESS,
    server: url.hostname,
    port: parseInt(url.port),
    uuid: url.username,
    flow: params.get('flow') || '',
    security: params.get('security') || 'none',
    network: params.get('type') || 'tcp',
    wsPath: params.get('path') || '',
    wsHeaders: params.get('host') ? { Host: params.get('host') } : {},
    tls: params.get('security') === 'tls',
    sni: params.get('sni') || params.get('host'),
    name: decodeURIComponent(url.hash.substring(1)) || 'VLess节点'
  };
}

/**
 * 解析Trojan URL
 */
function parseTrojanUrl(nodeUrl) {
  const url = new URL(nodeUrl);
  const params = new URLSearchParams(url.search);
  
  return {
    type: SUPPORTED_PROTOCOLS.TROJAN,
    server: url.hostname,
    port: parseInt(url.port),
    password: url.username,
    sni: params.get('sni') || url.hostname,
    name: decodeURIComponent(url.hash.substring(1)) || 'Trojan节点'
  };
}

/**
 * 解析Shadowsocks URL
 */
function parseShadowsocksUrl(nodeUrl) {
  const url = new URL(nodeUrl);
  const method = url.username.split(':')[0];
  const password = url.username.split(':')[1];
  
  return {
    type: SUPPORTED_PROTOCOLS.SHADOWSOCKS,
    server: url.hostname,
    port: parseInt(url.port),
    method: method,
    password: password,
    name: decodeURIComponent(url.hash.substring(1)) || 'Shadowsocks节点'
  };
}

/**
 * 解析ShadowsocksR URL
 */
function parseShadowsocksRUrl(nodeUrl) {
  // SSR URL格式比较复杂，这里简化处理
  const base64Part = nodeUrl.substring('ssr://'.length);
  const decoded = atob(base64Part);
  const parts = decoded.split('/');
  const mainPart = parts[0];
  const [server, port, protocol, method, obfs, password] = mainPart.split(':');
  
  return {
    type: SUPPORTED_PROTOCOLS.SHADOWSOCKSR,
    server: server,
    port: parseInt(port),
    protocol: protocol,
    method: method,
    obfs: obfs,
    password: password,
    name: 'SSR节点'
  };
}

/**
 * 生成随机用户代理
 * @returns {string} 随机用户代理字符串
 */
export function getRandomUserAgent() {
  const index = Math.floor(Math.random() * TEST_CONFIG.USER_AGENTS.length);
  return TEST_CONFIG.USER_AGENTS[index];
}

/**
 * 延迟函数
 * @param {number} ms - 延迟毫秒数
 * @returns {Promise} Promise对象
 */
export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 带重试的请求函数
 * @param {Function} requestFn - 请求函数
 * @param {number} maxRetries - 最大重试次数
 * @returns {Promise} 请求结果
 */
export async function retryRequest(requestFn, maxRetries = TEST_CONFIG.MAX_RETRIES) {
  let lastError;
  
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error;
      if (i < maxRetries) {
        await delay(TEST_CONFIG.RETRY_DELAY);
      }
    }
  }
  
  throw lastError;
} 