<template>
  <Modal :isOpen="isOpen" @close="$emit('close')" title="延迟测试历史">
    <div class="space-y-4">
      <!-- 历史记录列表 -->
      <div v-if="historyRecords.length > 0" class="space-y-3">
        <div 
          v-for="record in historyRecords" 
          :key="record.id"
          class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
        >
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-2">
              <span class="font-medium">{{ record.nodeName }}</span>
              <span 
                v-if="record.latency"
                :class="getLatencyClass(record.latency)"
                class="px-2 py-1 text-xs rounded-full"
              >
                {{ record.latency }}ms
              </span>
            </div>
            <span class="text-xs text-gray-500">{{ formatDate(record.timestamp) }}</span>
          </div>
          
          <div class="text-sm text-gray-600 dark:text-gray-400 mb-2">
            {{ record.nodeUrl }}
          </div>
          
          <div v-if="record.statistics" class="grid grid-cols-3 gap-2 text-xs">
            <div class="text-center">
              <div class="font-medium">最小</div>
              <div class="text-gray-600 dark:text-gray-400">{{ record.statistics.min }}ms</div>
            </div>
            <div class="text-center">
              <div class="font-medium">最大</div>
              <div class="text-gray-600 dark:text-gray-400">{{ record.statistics.max }}ms</div>
            </div>
            <div class="text-center">
              <div class="font-medium">成功率</div>
              <div class="text-gray-600 dark:text-gray-400">{{ record.statistics.successRate }}%</div>
            </div>
          </div>
          
          <div class="flex items-center justify-between mt-2">
            <span 
              :class="record.status === 'success' ? 'text-green-600' : 'text-red-600'"
              class="text-sm font-medium"
            >
              {{ record.status === 'success' ? '成功' : '失败' }}
            </span>
            <button 
              @click="deleteRecord(record.id)"
              class="text-xs text-red-600 hover:text-red-700"
            >
              删除
            </button>
          </div>
        </div>
      </div>
      
      <!-- 空状态 -->
      <div v-else class="text-center py-8 text-gray-500">
        <svg xmlns="http://www.w3.org/2000/svg" class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <h3 class="mt-4 text-lg font-medium">暂无历史记录</h3>
        <p class="mt-1 text-sm">开始延迟测试后，结果将显示在这里</p>
      </div>
      
      <!-- 操作按钮 -->
      <div class="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700">
        <button 
          @click="clearAllHistory"
          :disabled="historyRecords.length === 0"
          class="px-4 py-2 text-sm text-red-600 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          清空历史
        </button>
        <button 
          @click="exportHistory"
          :disabled="historyRecords.length === 0"
          class="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          导出历史
        </button>
      </div>
    </div>
  </Modal>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import Modal from './Modal.vue';
import { useToastStore } from '../stores/toast.js';

const props = defineProps({
  isOpen: Boolean
});

const emit = defineEmits(['close']);

const { showToast } = useToastStore();

const historyRecords = ref([]);

// 获取延迟状态样式
const getLatencyClass = (latency) => {
  if (latency <= 100) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
  if (latency <= 300) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
  if (latency <= 1000) return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
  return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
};

// 格式化日期
const formatDate = (timestamp) => {
  const date = new Date(timestamp);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// 加载历史记录
const loadHistory = () => {
  try {
    const saved = localStorage.getItem('latencyTestHistory');
    if (saved) {
      historyRecords.value = JSON.parse(saved);
    }
  } catch (error) {
    console.error('Failed to load latency test history:', error);
  }
};

// 保存历史记录
const saveHistory = () => {
  try {
    localStorage.setItem('latencyTestHistory', JSON.stringify(historyRecords.value));
  } catch (error) {
    console.error('Failed to save latency test history:', error);
  }
};

// 添加历史记录
const addHistoryRecord = (record) => {
  const newRecord = {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    ...record
  };
  
  historyRecords.value.unshift(newRecord);
  
  // 限制历史记录数量（最多保存100条）
  if (historyRecords.value.length > 100) {
    historyRecords.value = historyRecords.value.slice(0, 100);
  }
  
  saveHistory();
};

// 删除历史记录
const deleteRecord = (recordId) => {
  historyRecords.value = historyRecords.value.filter(record => record.id !== recordId);
  saveHistory();
  showToast('历史记录已删除', 'success');
};

// 清空所有历史记录
const clearAllHistory = () => {
  if (confirm('确定要清空所有历史记录吗？')) {
    historyRecords.value = [];
    saveHistory();
    showToast('历史记录已清空', 'success');
  }
};

// 导出历史记录
const exportHistory = () => {
  const data = historyRecords.value.map(record => ({
    节点名称: record.nodeName,
    节点地址: record.nodeUrl,
    延迟: record.latency ? `${record.latency}ms` : '测试失败',
    状态: record.status === 'success' ? '成功' : '失败',
    测试时间: formatDate(record.timestamp),
    最小延迟: record.statistics?.min ? `${record.statistics.min}ms` : '',
    最大延迟: record.statistics?.max ? `${record.statistics.max}ms` : '',
    成功率: record.statistics?.successRate ? `${record.statistics.successRate}%` : ''
  }));

  const csv = [
    Object.keys(data[0]).join(','),
    ...data.map(row => Object.values(row).map(v => `"${v}"`).join(','))
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `延迟测试历史_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.csv`;
  link.click();
  
  showToast('历史记录已导出', 'success');
};

// 暴露方法给父组件
defineExpose({
  addHistoryRecord
});

onMounted(() => {
  loadHistory();
});
</script> 