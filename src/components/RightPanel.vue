<script setup>
import { ref, computed, watch, onUnmounted } from 'vue';
import { useToastStore } from '../stores/toast.js';

const props = defineProps({
  subscriptions: {
    type: Array,
    default: () => []
  },
  profiles: {
    type: Array,
    default: () => []
  },
  config: {
    type: Object,
    default: () => ({})
  }
});

const { showToast } = useToastStore();

const selectedId = ref('default');
const selectedFormat = ref('自适应');
const showUrl = ref(false);
const copied = ref(false);
let copyTimeout = null;

const formats = ['自适应', 'Base64', 'Clash', 'Sing-Box', 'Surge', 'Loon'];

const subLink = computed(() => {
  if (!props.config?.mytoken) return '';
  
  const baseUrl = window.location.origin;
  const token = props.config.mytoken;
  const format = selectedFormat.value;
  
  // 构建基础URL
  let url;
  if (selectedId.value === 'default') {
    url = `${baseUrl}/${token}`;
  } else {
    url = `${baseUrl}/${token}/${selectedId.value}`;
  }
  
  // 根据格式添加参数
  if (format === '自适应') {
    return url;
  }
  
  const formatMapping = {
    'Base64': 'base64',
    'Clash': 'clash',
    'Sing-Box': 'singbox',
    'Surge': 'surge',
    'Loon': 'loon'
  };
  
  const formatParam = formatMapping[format] || format.toLowerCase();
  return `${url}?${formatParam}`;
});

const copyToClipboard = async () => {
  if (!subLink.value) {
    showToast('链接无效，无法复制', 'error');
    return;
  }
  navigator.clipboard.writeText(subLink.value);
  showToast('链接已复制到剪贴板', 'success');
  copied.value = true;
  clearTimeout(copyTimeout);
  copyTimeout = setTimeout(() => { copied.value = false; }, 2000);
};

onUnmounted(() => {
  clearTimeout(copyTimeout);
});
</script>

<template>
  <div class="sticky top-24">
    <div class="card-modern p-6 relative overflow-hidden">
      <!-- 装饰性背景 -->
      <div class="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-indigo-400/10 to-purple-400/10 rounded-full -translate-y-12 translate-x-12"></div>
      
      <div class="relative z-10">
        <h3 class="text-xl font-bold gradient-text mb-6">生成订阅链接</h3>

        <div class="mb-6">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">1. 选择订阅内容</label>
          <select v-model="selectedId" class="input-modern w-full text-sm">
            <option value="default">默认订阅 (全部启用节点)</option>
            <option v-for="profile in profiles" :key="profile.id" :value="profile.customId || profile.id">
              {{ profile.name }}
            </option>
          </select>
        </div>

        <div class="mb-6">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">2. 选择格式</label>
          <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
            <button
              v-for="format in formats"
              :key="format"
              @click="selectedFormat = format"
              class="px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-300 flex justify-center items-center transform hover:scale-105"
              :class="[
                selectedFormat === format
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg'
                  : 'bg-white/50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-300 hover:bg-white/80 dark:hover:bg-gray-700/50 border border-gray-200 dark:border-gray-700'
              ]"
            >
              {{ format }}
            </button>
          </div>
        </div>

        <div class="relative">
          <input
            type="text"
            :value="showUrl ? subLink : '••••••••••••••••••••••••••••••••••••••••'"
            readonly
            class="input-modern w-full text-sm text-gray-500 dark:text-gray-400 font-mono"
            :class="{ 'select-none': !showUrl }"
          />
          <div class="flex items-center gap-2 mt-3">
            <button 
              @click="showUrl = !showUrl"
              class="p-2 rounded-xl hover:bg-orange-500/20 text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-all duration-200"
              :title="showUrl ? '隐藏链接' : '显示链接'"
            >
              <svg v-if="showUrl" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
              </svg>
              <svg v-else class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </button>
            <button 
              v-if="showUrl"
              @click="copyToClipboard"
              class="p-2 rounded-xl hover:bg-yellow-500/20 text-gray-400 hover:text-yellow-600 dark:hover:text-yellow-400 transition-all duration-200"
              :title="copied ? '已复制' : '复制'"
            >
              <Transition name="fade" mode="out-in">
                <svg v-if="copied" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </Transition>
            </button>
          </div>
        </div>

        <div v-if="config?.mytoken === 'auto'" class="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800">
          <p class="text-xs text-yellow-700 dark:text-yellow-300">
            <svg class="inline w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            提示：当前为自动Token，链接可能会变化。为确保链接稳定，推荐在 "设置" 中配置一个固定Token。
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { 
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); 
}
.fade-enter-from { 
  opacity: 0; 
  transform: scale(0.9); 
}
.fade-leave-to { 
  opacity: 0; 
  transform: scale(1.1); 
}
</style>