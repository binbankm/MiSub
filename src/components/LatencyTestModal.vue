<template>
  <Modal :isOpen="isOpen" @close="$emit('close')" title="延迟测试">
    <div class="space-y-4">
      <!-- 测试设置 -->
      <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
        <h3 class="text-lg font-medium mb-3">测试设置</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium mb-1">测试超时时间 (秒)</label>
            <input 
              v-model.number="settings.timeout" 
              type="number" 
              min="1" 
              max="30"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
            />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">并发测试数</label>
            <input 
              v-model.number="settings.concurrency" 
              type="number" 
              min="1" 
              max="10"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
            />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">延迟警告阈值 (ms)</label>
            <input 
              v-model.number="settings.warningThreshold" 
              type="number" 
              min="100" 
              max="5000"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
            />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">测试次数</label>
            <input 
              v-model.number="settings.testCount" 
              type="number" 
              min="1" 
              max="5"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
            />
          </div>
        </div>
      </div>

      <!-- 测试控制 -->
      <div class="flex flex-wrap gap-2">
        <button 
          @click="startTest" 
          :disabled="isTesting"
          class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {{ isTesting ? '测试中...' : '开始测试' }}
        </button>
        <button 
          @click="stopTest" 
          :disabled="!isTesting"
          class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
        >
          停止测试
        </button>
        <button 
          @click="clearResults" 
          class="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
        >
          清空结果
        </button>
        <button 
          @click="showHistoryModal = true"
          class="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
        >
          历史记录
        </button>
      </div>

      <!-- 测试进度 -->
      <div v-if="isTesting" class="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm font-medium">测试进度</span>
          <span class="text-sm text-gray-600 dark:text-gray-400">{{ progress.current }}/{{ progress.total }}</span>
        </div>
        <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div 
            class="bg-blue-600 h-2 rounded-full transition-all duration-300"
            :style="{ width: `${(progress.current / progress.total) * 100}%` }"
          ></div>
        </div>
      </div>

      <!-- 测试结果 -->
      <div v-if="testResults.length > 0" class="space-y-3">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-medium">测试结果</h3>
          <div class="flex items-center gap-2">
            <button 
              @click="sortByLatency"
              class="text-sm text-blue-600 hover:text-blue-700"
            >
              按延迟排序
            </button>
            <button 
              @click="exportResults"
              class="text-sm text-green-600 hover:text-green-700"
            >
              导出结果
            </button>
          </div>
        </div>

        <div class="max-h-96 overflow-y-auto">
          <div 
            v-for="result in testResults" 
            :key="result.nodeId"
            class="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
          >
            <div class="flex-1">
              <div class="flex items-center gap-2">
                <span class="font-medium">{{ result.nodeName }}</span>
                <span 
                  v-if="result.latency"
                  :class="getLatencyClass(result.latency)"
                  class="px-2 py-1 text-xs rounded-full"
                >
                  {{ result.latency }}ms
                </span>
              </div>
              <div class="text-sm text-gray-600 dark:text-gray-400">
                {{ result.nodeUrl }}
              </div>
            </div>
            <div class="flex items-center gap-2">
              <div v-if="result.status === 'testing'" class="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
              <div v-else-if="result.status === 'success'" class="w-4 h-4 bg-green-500 rounded-full"></div>
              <div v-else-if="result.status === 'error'" class="w-4 h-4 bg-red-500 rounded-full"></div>
              <div v-else class="w-4 h-4 bg-gray-400 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- 统计信息 -->
      <div v-if="statistics" class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
        <h3 class="text-lg font-medium mb-3">统计信息</h3>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="text-center">
            <div class="text-2xl font-bold text-blue-600">{{ statistics.total }}</div>
            <div class="text-sm text-gray-600 dark:text-gray-400">总节点数</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-green-600">{{ statistics.success }}</div>
            <div class="text-sm text-gray-600 dark:text-gray-400">成功</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-red-600">{{ statistics.failed }}</div>
            <div class="text-sm text-gray-600 dark:text-gray-400">失败</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-orange-600">{{ statistics.avgLatency }}ms</div>
            <div class="text-sm text-gray-600 dark:text-gray-400">平均延迟</div>
          </div>
        </div>
      </div>
    </div>
  </Modal>
  
  <LatencyHistoryModal 
    ref="historyModalRef"
    :isOpen="showHistoryModal"
    @close="showHistoryModal = false"
  />
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import Modal from './Modal.vue';
import LatencyHistoryModal from './LatencyHistoryModal.vue';
import { useToastStore } from '../stores/toast.js';

const props = defineProps({
  isOpen: Boolean,
  subscriptions: Array,
  manualNodes: Array
});

const emit = defineEmits(['close']);

const { showToast } = useToastStore();

// 测试设置
const settings = ref({
  timeout: 5,
  concurrency: 3,
  warningThreshold: 1000,
  testCount: 1
});

// 测试状态
const isTesting = ref(false);
const progress = ref({ current: 0, total: 0 });
const testResults = ref([]);
const abortController = ref(null);
const showHistoryModal = ref(false);
const historyModalRef = ref(null);

// 统计信息
const statistics = computed(() => {
  if (testResults.value.length === 0) return null;
  
  const total = testResults.value.length;
  const success = testResults.value.filter(r => r.status === 'success').length;
  const failed = total - success;
  const successfulResults = testResults.value.filter(r => r.status === 'success' && r.latency);
  const avgLatency = successfulResults.length > 0 
    ? Math.round(successfulResults.reduce((sum, r) => sum + r.latency, 0) / successfulResults.length)
    : 0;

  return { total, success, failed, avgLatency };
});

// 获取延迟状态样式
const getLatencyClass = (latency) => {
  if (latency <= 100) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
  if (latency <= 300) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
  if (latency <= 1000) return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
  return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
};

// 开始测试
const startTest = async () => {
  if (isTesting.value) return;
  
  const allNodes = [];
  
  // 收集所有需要测试的节点
  props.subscriptions?.forEach(sub => {
    if (sub.enabled && sub.url.startsWith('http')) {
      allNodes.push({
        id: sub.id,
        name: sub.name || '未命名订阅',
        url: sub.url,
        type: 'subscription'
      });
    }
  });
  
  props.manualNodes?.forEach(node => {
    if (node.enabled) {
      allNodes.push({
        id: node.id,
        name: node.name || '手动节点',
        url: node.url,
        type: 'manual'
      });
    }
  });

  if (allNodes.length === 0) {
    showToast('没有可测试的节点', 'warning');
    return;
  }

  isTesting.value = true;
  progress.value = { current: 0, total: allNodes.length };
  testResults.value = allNodes.map(node => ({
    ...node,
    status: 'pending',
    latency: null,
    error: null
  }));

  abortController.value = new AbortController();

  try {
    await runLatencyTests(allNodes);
  } catch (error) {
    if (error.name !== 'AbortError') {
      showToast('测试过程中发生错误', 'error');
    }
  } finally {
    isTesting.value = false;
    abortController.value = null;
  }
};

// 运行延迟测试
const runLatencyTests = async (nodes) => {
  const { concurrency } = settings.value;
  const chunks = [];
  
  // 将节点分组
  for (let i = 0; i < nodes.length; i += concurrency) {
    chunks.push(nodes.slice(i, i + concurrency));
  }

  for (const chunk of chunks) {
    if (abortController.value?.signal.aborted) break;
    
    const promises = chunk.map(node => testNodeLatency(node));
    await Promise.allSettled(promises);
    
    progress.value.current += chunk.length;
  }
};

// 测试单个节点延迟
const testNodeLatency = async (node) => {
  const resultIndex = testResults.value.findIndex(r => r.id === node.id);
  if (resultIndex === -1) return;

  testResults.value[resultIndex].status = 'testing';

  try {
    const startTime = Date.now();
    const response = await fetch('/api/test_latency', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: node.url,
        timeout: settings.value.timeout * 1000,
        testCount: settings.value.testCount
      }),
      signal: abortController.value?.signal
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    
    if (data.success) {
      testResults.value[resultIndex] = {
        ...testResults.value[resultIndex],
        status: 'success',
        latency: data.latency,
        error: null,
        statistics: data.statistics
      };
      
      // 添加到历史记录
      if (historyModalRef.value) {
        historyModalRef.value.addHistoryRecord({
          nodeName: testResults.value[resultIndex].nodeName,
          nodeUrl: testResults.value[resultIndex].nodeUrl,
          status: 'success',
          latency: data.latency,
          statistics: data.statistics
        });
      }
    } else {
      throw new Error(data.error || '测试失败');
    }
  } catch (error) {
    testResults.value[resultIndex] = {
      ...testResults.value[resultIndex],
      status: 'error',
      latency: null,
      error: error.message
    };
    
    // 添加到历史记录
    if (historyModalRef.value) {
      historyModalRef.value.addHistoryRecord({
        nodeName: testResults.value[resultIndex].nodeName,
        nodeUrl: testResults.value[resultIndex].nodeUrl,
        status: 'error',
        latency: null,
        error: error.message
      });
    }
  }
};

// 停止测试
const stopTest = () => {
  if (abortController.value) {
    abortController.value.abort();
  }
};

// 清空结果
const clearResults = () => {
  testResults.value = [];
  progress.value = { current: 0, total: 0 };
};

// 按延迟排序
const sortByLatency = () => {
  testResults.value.sort((a, b) => {
    if (a.status !== 'success' && b.status !== 'success') return 0;
    if (a.status !== 'success') return 1;
    if (b.status !== 'success') return -1;
    return a.latency - b.latency;
  });
};

// 导出结果
const exportResults = () => {
  const data = testResults.value.map(result => ({
    节点名称: result.nodeName,
    节点地址: result.nodeUrl,
    延迟: result.latency ? `${result.latency}ms` : '测试失败',
    状态: result.status === 'success' ? '成功' : '失败',
    错误信息: result.error || ''
  }));

  const csv = [
    Object.keys(data[0]).join(','),
    ...data.map(row => Object.values(row).map(v => `"${v}"`).join(','))
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `延迟测试结果_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.csv`;
  link.click();
  
  showToast('结果已导出', 'success');
};

// 监听模态框关闭
watch(() => props.isOpen, (newVal) => {
  if (!newVal && isTesting.value) {
    stopTest();
  }
});
</script> 