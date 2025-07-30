<script setup>
import { ref, computed, onUnmounted } from 'vue';
import { useToastStore } from '../stores/toast.js';

const props = defineProps({
  config: Object,
  profiles: Array,
});

const { showToast } = useToastStore();

const copied = ref(false);
let copyTimeout = null;

const formats = ['自适应', 'Base64', 'Clash', 'Sing-Box', 'Surge', 'Loon'];
const selectedFormat = ref('自适应');
const selectedId = ref('default'); 

const subLink = computed(() => {
  const origin = window.location.origin;
  let token = '';
  let baseUrl = '';

  // --- [修改] ---
  if (selectedId.value === 'default') {
    // 選擇“默認訂閱”，使用主 Token
    token = props.config?.mytoken;
    if (!token) return '主Token未在设置中配置';
    baseUrl = `${origin}/${token}`;
  } else {
    // 選擇“訂閱組”，使用分享 Token
    token = props.config?.profileToken;
    if (!token) return '分享Token未在设置中配置';
    baseUrl = `${origin}/${token}/${selectedId.value}`;
  }
  // ---

  if (selectedFormat.value === '自适应') {
    return baseUrl;
  }
  
  const targetMapping = { 'Sing-Box': 'singbox', 'QuanX': 'quanx' };
  const formatKey = (targetMapping[selectedFormat.value] || selectedFormat.value.toLowerCase());
  return `${baseUrl}?${formatKey}`;
});

// URL显示状态
const showUrl = ref(false);

const copyToClipboard = () => {
    if (!subLink.value || subLink.value.includes('未在设置中配置')) {
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
    <div class="bg-white/50 dark:bg-gray-900/60 backdrop-blur-sm p-5 rounded-2xl shadow-lg dark:shadow-2xl ring-1 ring-black/5">
      <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-4">生成订阅链接</h3>

      <div class="mb-4">
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">1. 选择订阅内容</label>
        <select v-model="selectedId" class="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:text-white">
            <option value="default">默认订阅 (全部启用节点)</option>
            <option v-for="profile in profiles" :key="profile.id" :value="profile.customId || profile.id">
                {{ profile.name }}
            </option>
        </select>
      </div>

      <div class="mb-5">
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">2. 选择格式</label>
        <div class="grid grid-cols-3 gap-2">
            <button
              v-for="format in formats"
              :key="format"
              @click="selectedFormat = format"
              class="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex justify-center items-center"
              :class="[
                selectedFormat === format
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-gray-200/80 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 hover:bg-gray-300/80 dark:hover:bg-gray-600/50'
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
          class="w-full text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800/50 rounded-lg px-3 py-2.5 focus:outline-none font-mono"
          :class="{ 'select-none': !showUrl }"
        />
        <div class="flex items-center gap-2 mt-2">
          <button 
            @click="showUrl = !showUrl"
            class="p-1.5 rounded-full hover:bg-gray-500/10 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
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
            class="p-1.5 rounded-full hover:bg-gray-500/10 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
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

       <p v-if="config?.mytoken === 'auto'" class="text-xs text-yellow-600 dark:text-yellow-500 mt-2">
           提示：当前为自动Token，链接可能会变化。为确保链接稳定，推荐在 "设置" 中配置一个固定Token。
       </p>
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>