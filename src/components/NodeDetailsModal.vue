<script setup>
import { ref, computed, watch } from 'vue';
import { useToastStore } from '../stores/toast.js';
import Modal from './Modal.vue';

const props = defineProps({
  show: Boolean,
  subscription: Object,
});

const emit = defineEmits(['update:show']);

const nodes = ref([]);
const isLoading = ref(false);
const errorMessage = ref('');
const searchTerm = ref('');
const selectedNodes = ref(new Set());

const toastStore = useToastStore();

// 监听模态框显示状态
watch(() => props.show, async (newVal) => {
  if (newVal && props.subscription) {
    await fetchNodes();
  } else {
    nodes.value = [];
    searchTerm.value = '';
    selectedNodes.value.clear();
    errorMessage.value = '';
  }
});

// 过滤后的节点列表
const filteredNodes = computed(() => {
  if (!searchTerm.value) return nodes.value;
  const term = searchTerm.value.toLowerCase();
  return nodes.value.filter(node => 
    node.name.toLowerCase().includes(term) ||
    node.url.toLowerCase().includes(term)
  );
});

// 获取节点信息
const fetchNodes = async () => {
  if (!props.subscription?.url) return;
  
  isLoading.value = true;
  errorMessage.value = '';
  
  try {
    const response = await fetch('/api/fetch_external_url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: props.subscription.url })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const content = await response.text();
    const parsedNodes = parseNodes(content);
    nodes.value = parsedNodes;
    
  } catch (error) {
    console.error('获取节点信息失败:', error);
    errorMessage.value = `获取节点信息失败: ${error.message}`;
    toastStore.showToast('获取节点信息失败', 'error');
  } finally {
    isLoading.value = false;
  }
};

// 解析节点信息
const parseNodes = (content) => {
  const nodes = [];
  const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');

  // 尝试 Base64 解码
  try {
    const decodedContent = atob(content);
    const decodedLines = decodedContent.split(/\r?\n/).filter(line => line.trim() !== '');
    if (decodedLines.some(line => line.includes('://'))) {
      for (const line of decodedLines) {
        if (line.includes('://')) {
          const nodeInfo = parseNodeLine(line);
          if (nodeInfo) {
            nodes.push(nodeInfo);
          }
        }
      }
      if (nodes.length > 0) return nodes;
    }
  } catch (e) {
    // 不是 Base64 编码
  }

  // 直接解析原始内容
  for (const line of lines) {
    if (line.includes('://')) {
      const nodeInfo = parseNodeLine(line);
      if (nodeInfo) {
        nodes.push(nodeInfo);
      }
    }
  }

  return nodes;
};

// 解析单行节点信息
const parseNodeLine = (line) => {
  const nodeRegex = /^(ss|ssr|vmess|vless|trojan|hysteria2?|hy|hy2|tuic|anytls|socks5):\/\//;
  if (!nodeRegex.test(line)) return null;

  // 提取节点名称（如果有的话）
  let name = '';
  let url = line;
  
  // 尝试从 URL 中提取名称
  if (line.includes('#')) {
    const parts = line.split('#');
    url = parts[0];
    name = decodeURIComponent(parts[1] || '');
  }
  
  // 如果没有名称，尝试从 URL 中提取服务器信息
  if (!name) {
    try {
      // 对于不同协议，尝试提取服务器信息
      const protocol = line.match(nodeRegex)?.[1] || 'unknown';
      
      switch (protocol) {
        case 'vmess':
          // vmess://base64(json)
          try {
            const vmessContent = line.replace('vmess://', '');
            const decoded = atob(vmessContent);
            const vmessConfig = JSON.parse(decoded);
            name = vmessConfig.ps || vmessConfig.add || 'VMess节点';
          } catch {
            name = 'VMess节点';
          }
          break;
        case 'vless':
          // vless://uuid@server:port?type=ws&security=tls#name
          const vlessMatch = line.match(/vless:\/\/([^@]+)@([^:]+):(\d+)/);
          if (vlessMatch) {
            name = decodeURIComponent(line.split('#')[1] || '') || vlessMatch[2] || 'VLESS节点';
          } else {
            name = 'VLESS节点';
          }
          break;
        case 'trojan':
          // trojan://password@server:port#name
          const trojanMatch = line.match(/trojan:\/\/([^@]+)@([^:]+):(\d+)/);
          if (trojanMatch) {
            name = decodeURIComponent(line.split('#')[1] || '') || trojanMatch[2] || 'Trojan节点';
          } else {
            name = 'Trojan节点';
          }
          break;
        case 'ss':
          // ss://base64(method:password@server:port)#name
          const ssMatch = line.match(/ss:\/\/([^#]+)/);
          if (ssMatch) {
            try {
              const decoded = atob(ssMatch[1]);
              const [auth, server] = decoded.split('@');
              const host = server.split(':')[0];
              name = decodeURIComponent(line.split('#')[1] || '') || host || 'SS节点';
            } catch {
              name = 'SS节点';
            }
          } else {
            name = 'SS节点';
          }
          break;
        case 'ssr':
          // ssr://base64(server:port:protocol:method:obfs:base64(password)/?obfsparam=base64(param)&protoparam=base64(param)&remarks=base64(name)&group=base64(group)&udpport=0&uot=0)
          const ssrMatch = line.match(/ssr:\/\/([^#]+)/);
          if (ssrMatch) {
            try {
              const decoded = atob(ssrMatch[1]);
              const parts = decoded.split('/');
              const serverPart = parts[0];
              const server = serverPart.split(':')[0];
              name = decodeURIComponent(line.split('#')[1] || '') || server || 'SSR节点';
            } catch {
              name = 'SSR节点';
            }
          } else {
            name = 'SSR节点';
          }
          break;
        default:
          // 尝试从 URL 中提取主机名
          const urlObj = new URL(url);
          name = urlObj.hostname || '未命名节点';
          break;
      }
    } catch {
      name = '未命名节点';
    }
  }

  // 获取协议类型
  const protocol = line.match(nodeRegex)?.[1] || 'unknown';
  
  return {
    id: crypto.randomUUID(),
    name: name || '未命名节点',
    url: line,
    protocol: protocol,
    enabled: true
  };
};

// 获取协议图标和样式
const getProtocolInfo = (protocol) => {
  const protocolMap = {
    'ss': { icon: '🔒', color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30' },
    'ssr': { icon: '🛡️', color: 'text-purple-500', bg: 'bg-purple-100 dark:bg-purple-900/30' },
    'vmess': { icon: '⚡', color: 'text-green-500', bg: 'bg-green-100 dark:bg-green-900/30' },
    'vless': { icon: '🚀', color: 'text-indigo-500', bg: 'bg-indigo-100 dark:bg-indigo-900/30' },
    'trojan': { icon: '🛡️', color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900/30' },
    'hysteria': { icon: '⚡', color: 'text-yellow-500', bg: 'bg-yellow-100 dark:bg-yellow-900/30' },
    'hysteria2': { icon: '⚡', color: 'text-orange-500', bg: 'bg-orange-100 dark:bg-orange-900/30' },
    'tuic': { icon: '🚀', color: 'text-teal-500', bg: 'bg-teal-100 dark:bg-teal-900/30' },
    'socks5': { icon: '🔌', color: 'text-gray-500', bg: 'bg-gray-100 dark:bg-gray-900/30' },
  };
  
  return protocolMap[protocol] || { icon: '❓', color: 'text-gray-500', bg: 'bg-gray-100 dark:bg-gray-900/30' };
};

// 选择/取消选择节点
const toggleNodeSelection = (nodeId) => {
  if (selectedNodes.value.has(nodeId)) {
    selectedNodes.value.delete(nodeId);
  } else {
    selectedNodes.value.add(nodeId);
  }
};

// 全选/取消全选
const toggleSelectAll = () => {
  if (selectedNodes.value.size === filteredNodes.value.length) {
    selectedNodes.value.clear();
  } else {
    filteredNodes.value.forEach(node => selectedNodes.value.add(node.id));
  }
};

// 复制选中的节点
const copySelectedNodes = () => {
  const selectedNodeUrls = filteredNodes.value
    .filter(node => selectedNodes.value.has(node.id))
    .map(node => node.url);
  
  if (selectedNodeUrls.length === 0) {
    toastStore.showToast('请先选择要复制的节点', 'warning');
    return;
  }
  
  navigator.clipboard.writeText(selectedNodeUrls.join('\n')).then(() => {
    toastStore.showToast(`已复制 ${selectedNodeUrls.length} 个节点到剪贴板`, 'success');
  }).catch(() => {
    toastStore.showToast('复制失败', 'error');
  });
};

// 刷新节点信息
const refreshNodes = async () => {
  await fetchNodes();
  toastStore.showToast('节点信息已刷新', 'success');
};
</script>

<template>
  <Modal
    :show="show"
    @update:show="emit('update:show', $event)"
    title="节点详情"
    size="lg"
  >
    <div class="space-y-4">
      <!-- 订阅信息头部 -->
      <div v-if="subscription" class="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="font-semibold text-gray-900 dark:text-gray-100">
              {{ subscription.name || '未命名订阅' }}
            </h3>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {{ subscription.url }}
            </p>
          </div>
          <div class="text-right">
            <p class="text-sm text-gray-600 dark:text-gray-300">
              共 {{ nodes.length }} 个节点
            </p>
            <p v-if="subscription.nodeCount" class="text-xs text-gray-500 dark:text-gray-400">
              上次更新: {{ subscription.nodeCount }} 个
            </p>
          </div>
        </div>
      </div>

      <!-- 搜索和操作栏 -->
      <div class="flex items-center justify-between gap-4">
        <div class="flex-1">
          <input
            v-model="searchTerm"
            type="text"
            placeholder="搜索节点名称或链接..."
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div class="flex items-center gap-2">
          <button
            @click="refreshNodes"
            :disabled="isLoading"
            class="px-3 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg v-if="isLoading" class="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span v-else>刷新</span>
          </button>
          <button
            @click="copySelectedNodes"
            :disabled="selectedNodes.size === 0"
            class="px-3 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            复制选中
          </button>
        </div>
      </div>

      <!-- 错误信息 -->
      <div v-if="errorMessage" class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
        <p class="text-red-600 dark:text-red-400 text-sm">{{ errorMessage }}</p>
      </div>

      <!-- 加载状态 -->
      <div v-if="isLoading" class="flex items-center justify-center py-8">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <span class="ml-2 text-gray-600 dark:text-gray-400">正在获取节点信息...</span>
      </div>

      <!-- 节点列表 -->
      <div v-else-if="filteredNodes.length > 0" class="space-y-2">
        <!-- 全选按钮 -->
        <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
          <label class="flex items-center cursor-pointer">
            <input
              type="checkbox"
              :checked="selectedNodes.size === filteredNodes.length && filteredNodes.length > 0"
              :indeterminate="selectedNodes.size > 0 && selectedNodes.size < filteredNodes.length"
              @change="toggleSelectAll"
              class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span class="ml-2 text-sm text-gray-700 dark:text-gray-300">
              全选 ({{ selectedNodes.size }}/{{ filteredNodes.length }})
            </span>
          </label>
        </div>

        <!-- 节点卡片列表 -->
        <div class="max-h-96 overflow-y-auto space-y-2">
          <div
            v-for="node in filteredNodes"
            :key="node.id"
            class="flex items-center p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
          >
            <input
              type="checkbox"
              :checked="selectedNodes.has(node.id)"
              @change="toggleNodeSelection(node.id)"
              class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 mr-3"
            />
            
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1">
                <span 
                  class="text-xs px-2 py-1 rounded-full"
                  :class="getProtocolInfo(node.protocol).bg + ' ' + getProtocolInfo(node.protocol).color"
                >
                  {{ getProtocolInfo(node.protocol).icon }} {{ node.protocol.toUpperCase() }}
                </span>
              </div>
              <p class="font-medium text-gray-900 dark:text-gray-100 truncate" :title="node.name">
                {{ node.name }}
              </p>
              <p class="text-xs text-gray-500 dark:text-gray-400 truncate mt-1" :title="node.url">
                {{ node.url }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else class="text-center py-8">
        <div class="text-gray-400 dark:text-gray-500 mb-2">
          <svg class="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <p class="text-gray-500 dark:text-gray-400">
          {{ searchTerm ? '没有找到匹配的节点' : '暂无节点信息' }}
        </p>
      </div>
    </div>
  </Modal>
</template> 