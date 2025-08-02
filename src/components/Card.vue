<script setup>
import { computed, ref } from 'vue';
import { useToastStore } from '../stores/toast.js';

const props = defineProps({
  misub: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['delete', 'change', 'update', 'edit', 'showNodes']);

const toastStore = useToastStore();

// 复制URL函数
const copyUrl = async () => {
  try {
    await navigator.clipboard.writeText(props.misub.url);
    toastStore.showToast('链接已复制到剪贴板', 'success');
  } catch (error) {
    console.error('复制失败:', error);
    toastStore.showToast('复制失败', 'error');
  }
};

// URL显示状态
const showUrl = ref(false);

// 切换URL显示状态
const toggleUrlVisibility = () => {
  showUrl.value = !showUrl.value;
};

// 鼠标事件处理
const mouseDownTime = ref(0);
const mouseDownPosition = ref({ x: 0, y: 0 });
const hasDragged = ref(false);

const handleMouseDown = (event) => {
  mouseDownTime.value = Date.now();
  mouseDownPosition.value = { x: event.clientX, y: event.clientY };
  hasDragged.value = false;
  
  // 添加鼠标移动和抬起事件监听
  const handleMouseMove = (e) => {
    const deltaX = Math.abs(e.clientX - mouseDownPosition.value.x);
    const deltaY = Math.abs(e.clientY - mouseDownPosition.value.y);
    if (deltaX > 5 || deltaY > 5) {
      hasDragged.value = true;
    }
  };
  
  const handleMouseUp = () => {
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };
  
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
};

const getProtocol = (url) => {
  try {
    if (!url) return 'unknown';
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.startsWith('https://')) return 'https';
    if (lowerUrl.startsWith('http://')) return 'http';
    if (lowerUrl.includes('clash')) return 'clash';
  } catch {
    return 'unknown';
  }
  return 'unknown';
};

const protocol = computed(() => getProtocol(props.misub.url));

const protocolStyle = computed(() => {
  const p = protocol.value;
  switch (p) {
    case 'https': return { text: 'HTTPS', style: 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-600 dark:text-green-400 border-green-500/30' };
    case 'clash': return { text: 'CLASH', style: 'bg-gradient-to-r from-sky-500/20 to-blue-500/20 text-sky-600 dark:text-sky-400 border-sky-500/30' };
    case 'http': return { text: 'HTTP', style: 'bg-gradient-to-r from-gray-500/20 to-slate-500/20 text-gray-600 dark:text-gray-400 border-gray-500/30' };
    default: return { text: 'SUB', style: 'bg-gradient-to-r from-gray-500/20 to-slate-500/20 text-gray-600 dark:text-gray-400 border-gray-500/30' };
  }
});

const formatBytes = (bytes, decimals = 2) => {
  if (!+bytes) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

const trafficInfo = computed(() => {
  const info = props.misub.userInfo;
  if (!info || info.total === undefined || info.download === undefined || info.upload === undefined) return null;
  const total = info.total;
  const used = info.download + info.upload;
  const percentage = total > 0 ? Math.min((used / total) * 100, 100) : 0;
  return {
    used: formatBytes(used),
    total: formatBytes(total),
    percentage: percentage,
  };
});

const expiryInfo = computed(() => {
    const expireTimestamp = props.misub.userInfo?.expire;
    if (!expireTimestamp) return null;
    const expiryDate = new Date(expireTimestamp * 1000);
    const now = new Date();
    expiryDate.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
    let style = 'text-gray-500 dark:text-gray-400';
    if (diffDays < 0) style = 'text-red-500 font-bold';
    else if (diffDays <= 7) style = 'text-yellow-500 font-semibold';
    return {
        date: expiryDate.toLocaleDateString(),
        daysRemaining: diffDays < 0 ? '已過期' : (diffDays === 0 ? '今天到期' : `${diffDays} 天后`),
        style: style
    };
});
</script>

<template>
  <div 
    class="card-modern group relative overflow-hidden transition-all duration-300 hover:scale-[1.02] flex flex-col h-full min-h-[200px]"
    :class="{ 'opacity-50': !misub.enabled, 'ring-2 ring-indigo-500/50': misub.isNew }"
    @mousedown="handleMouseDown"
  >
    <!-- 装饰性背景 -->
    <div class="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-indigo-400/10 to-purple-400/10 rounded-full -translate-y-10 translate-x-10"></div>
    
    <div class="relative z-10 flex-1 flex flex-col">
      <!-- 头部区域 -->
      <div class="flex items-start justify-between gap-3 mb-4">
        <div class="w-full truncate">
          <div class="flex items-center gap-2 mb-2">
            <div class="text-xs font-bold px-3 py-1 rounded-full border flex-shrink-0" :class="protocolStyle.style">
              {{ protocolStyle.text }}
            </div>
          </div>
          <div class="flex items-center gap-2">
            <p class="font-bold text-xl text-gray-800 dark:text-gray-100 truncate" :title="misub.name || '未命名订阅'">
              {{ misub.name || '未命名订阅' }}
            </p>
          </div>
        </div>
        
        <div class="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300">
          <button @click.stop="emit('edit')" class="p-2 rounded-xl hover:bg-indigo-500/10 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all duration-200" title="编辑">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.536L16.732 3.732z" />
            </svg>
          </button>
          <button @click.stop="emit('delete')" class="p-2 rounded-xl hover:bg-red-500/10 text-gray-400 hover:text-red-500 transition-all duration-200" title="删除">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
      
      <!-- URL区域 -->
      <div class="flex-grow flex flex-col justify-center space-y-3">
        <div class="relative">
          <input 
            type="text" 
            :value="showUrl ? misub.url : '••••••••••••••••••••••••••••••••••••••••'"
            readonly 
            class="input-modern w-full text-sm text-gray-500 dark:text-gray-400 font-mono" 
            :class="{ 'select-none': !showUrl }"
          />
          <div class="flex items-center gap-2 mt-3">
            <button 
              @click.stop="toggleUrlVisibility"
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
              @click.stop="copyUrl"
              class="p-2 rounded-xl hover:bg-yellow-500/20 text-gray-400 hover:text-yellow-600 dark:hover:text-yellow-400 transition-all duration-200"
              title="复制链接"
            >
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
        </div>
        
        <!-- 流量信息 -->
        <div v-if="trafficInfo" class="space-y-2">
          <div class="flex justify-between text-sm font-mono">
            <span class="text-gray-600 dark:text-gray-400">{{ trafficInfo.used }}</span>
            <span class="text-gray-600 dark:text-gray-400">{{ trafficInfo.total }}</span>
          </div>
          <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
            <div class="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 h-2 rounded-full transition-all duration-500" :style="{ width: trafficInfo.percentage + '%' }"></div>
          </div>
        </div>
      </div>

      <!-- 底部控制区域 -->
      <div class="flex justify-between items-center mt-4 pt-4 border-t border-gray-200 dark:border-gray-700" @click.stop>
        <div class="flex items-center gap-3">
          <label class="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" v-model="misub.enabled" @change="emit('change')" class="sr-only peer">
            <div class="w-12 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-gradient-to-r from-indigo-500 to-purple-600"></div>
          </label>
          <span v-if="expiryInfo" class="text-sm font-medium" :class="expiryInfo.style">{{ expiryInfo.daysRemaining }}</span>
        </div>
        
        <div class="flex items-center space-x-3">
          <span class="text-sm font-semibold" :class="misub.isUpdating ? 'text-yellow-500 animate-pulse' : 'text-gray-700 dark:text-gray-300'">
            {{ misub.isUpdating ? '更新中...' : `${misub.nodeCount} 节点` }}
          </span>
          <button @click.stop="emit('showNodes')" class="text-sm font-semibold px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white transition-all duration-300 shadow-lg hover:shadow-xl flex items-center gap-2 transform hover:scale-105" title="显示节点信息">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            显示节点
          </button>
          <button @click.stop="emit('update')" :disabled="misub.isUpdating" class="p-2 rounded-xl text-gray-400 hover:text-indigo-500 hover:bg-indigo-500/10 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed" title="更新节点数和流量">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" :class="{'animate-spin': misub.isUpdating}" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>