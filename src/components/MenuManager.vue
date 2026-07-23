<script setup>
import { ref, onMounted, onUnmounted, watch, inject, computed } from 'vue';
import CustomSelect from './CustomSelect.vue';
import { Key, Eye, EyeOff, Store, Image as ImageIcon, Loader2, Scan, FileJson, Save, Cpu, BarChart3, Trash2, X, Layers, RefreshCw } from 'lucide-vue-next';

const triggerToast = inject('triggerToast');
const triggerConfirm = inject('triggerConfirm');

const apiKey = ref('');
const isKeySaved = ref(false);
const showKey = ref(false);

const selectedModel = ref('gemini-3.6-flash');
const customModelName = ref('');
const isCustomModel = ref(false);
const showUsageModal = ref(false);
const usageData = ref({ models: {}, history: [] });
const isFetchingModels = ref(false);

let usageModalId = null;

watch(showUsageModal, (newVal) => {
  if (newVal) {
    if (!usageModalId && window.registerModal) {
      usageModalId = window.registerModal(() => {
        showUsageModal.value = false;
      });
    }
  } else {
    if (usageModalId && window.unregisterModal) {
      window.unregisterModal(usageModalId);
      usageModalId = null;
    }
  }
});

onUnmounted(() => {
  if (usageModalId && window.unregisterModal) {
    window.unregisterModal(usageModalId);
    usageModalId = null;
  }
});

const defaultModelOptions = [
  { id: 'gemini-3.6-flash', label: 'Gemini 3.6 Flash (最新推薦)' },
  { id: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash-Lite (極速輕量)' },
  { id: 'gemini-3.5-flash', label: 'Gemini 3.5 Flash' },
  { id: 'gemini-3.1-pro', label: 'Gemini 3.1 Pro (高階推理)' },
  { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
  { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
  { id: 'custom', label: '自訂模型名稱...' }
];

const modelOptions = ref([...defaultModelOptions]);

const fetchModelsFromApi = async () => {
  isFetchingModels.value = true;
  try {
    const keyToPass = apiKey.value ? apiKey.value.trim() : '';
    const res = await window.electronAPI.fetchAvailableModels(keyToPass);
    if (res.success && res.models && res.models.length > 0) {
      modelOptions.value = [
        ...res.models,
        { id: 'custom', label: '自訂模型名稱...' }
      ];
      triggerToast(`已成功獲取 ${res.models.length} 個可用 Gemini 模型！`);
    } else {
      triggerToast('獲取模型失敗：' + (res.message || '請檢查 API Key 設定'));
    }
  } catch (e) {
    triggerToast('獲取失敗：' + e.message);
  } finally {
    isFetchingModels.value = false;
  }
};

const activeModelName = computed(() => {
  if (selectedModel.value === 'custom') {
    return customModelName.value.trim() || 'gemini-3.6-flash';
  }
  return selectedModel.value;
});

const shops = ref([]);
const selectedShopId = ref('');
const shopOptions = computed(() => {
  return shops.value.map(shop => ({
    id: shop.id,
    displayName: `${shop.name} (${shop.category === 'drink' ? '飲料' : '食物'})`
  }));
});
const currentMenu = ref('');
const currentImage = ref(null);
const isScanning = ref(false);

const loadApiKey = async () => {
  const key = await window.electronAPI.getApiKey();
  if (key) {
    apiKey.value = key;
    isKeySaved.value = true;
  }
};

const loadSelectedModel = async () => {
  if (window.electronAPI.getCachedModels) {
    const cached = await window.electronAPI.getCachedModels();
    if (cached && Array.isArray(cached) && cached.length > 0) {
      modelOptions.value = [
        ...cached,
        { id: 'custom', label: '自訂模型名稱...' }
      ];
    }
  }

  if (window.electronAPI.getSelectedModel) {
    const saved = await window.electronAPI.getSelectedModel();
    if (saved) {
      const match = modelOptions.value.find(m => m.id === saved);
      if (match && match.id !== 'custom') {
        selectedModel.value = saved;
        isCustomModel.value = false;
      } else {
        selectedModel.value = 'custom';
        customModelName.value = saved;
        isCustomModel.value = true;
      }
    }
  }
};

const handleModelChange = async (val) => {
  if (val === 'custom') {
    isCustomModel.value = true;
    if (customModelName.value.trim()) {
      await window.electronAPI.saveSelectedModel(customModelName.value.trim());
    }
  } else {
    isCustomModel.value = false;
    await window.electronAPI.saveSelectedModel(val);
  }
};

const handleCustomModelBlur = async () => {
  if (isCustomModel.value && customModelName.value.trim()) {
    await window.electronAPI.saveSelectedModel(customModelName.value.trim());
  }
};

const saveApiKey = async () => {
  if (!apiKey.value.trim()) {
    triggerToast('請輸入 API Key');
    return;
  }
  await window.electronAPI.saveApiKey(apiKey.value.trim());
  isKeySaved.value = true;
  triggerToast('API Key 已儲存於本機');
};

const deleteApiKey = async () => {
  const confirmed = await triggerConfirm({
    title: '刪除 API Key',
    message: '確定要清除本機的 API Key 嗎？',
    confirmText: '清除',
    type: 'warning'
  });
  if (confirmed) {
    await window.electronAPI.deleteApiKey();
    apiKey.value = '';
    isKeySaved.value = false;
    triggerToast('API Key 已清除');
  }
};

const loadShops = async () => {
  shops.value = await window.electronAPI.getShops();
};

const onShopChange = async () => {
  currentMenu.value = '';
  currentImage.value = null;
  if (!selectedShopId.value) return;

  const menu = await window.electronAPI.getMenu(selectedShopId.value);
  if (menu) {
    currentMenu.value = JSON.stringify(menu, null, 2);
  }

  const img = await window.electronAPI.getMenuImage(selectedShopId.value);
  if (img) {
    currentImage.value = img;
  }
};

const scanMenu = async () => {
  if (!apiKey.value) {
    triggerToast('請先設定 API Key');
    return;
  }
  if (!currentImage.value) {
    triggerToast('此店家沒有圖片，無法辨識');
    return;
  }

  const shop = shops.value.find(s => s.id === selectedShopId.value);
  
  isScanning.value = true;
  try {
    const result = await window.electronAPI.scanMenu({
      shopId: shop.id,
      shopName: shop.name,
      category: shop.category || 'drink',
      imageBase64: currentImage.value,
      apiKey: apiKey.value,
      model: activeModelName.value
    });

    if (result.success) {
      currentMenu.value = JSON.stringify(result.data, null, 2);
      let toastMsg = '辨識完成！請校對後儲存';
      if (result.usage && result.usage.totalTokens) {
        toastMsg += ` (消耗 ${result.usage.totalTokens} Tokens)`;
      }
      triggerToast(toastMsg);
    } else {
      triggerToast('辨識失敗：' + result.message);
      console.error(result.message);
    }
  } catch (error) {
    triggerToast('發生錯誤');
    console.error(error);
  } finally {
    isScanning.value = false;
  }
};

const saveMenu = async () => {
  if (!currentMenu.value.trim()) return;
  
  try {
    const parsed = JSON.parse(currentMenu.value);
    const success = await window.electronAPI.saveMenu(selectedShopId.value, parsed);
    if (success) {
      triggerToast('菜單已成功儲存');
    } else {
      triggerToast('儲存失敗');
    }
  } catch (e) {
    triggerToast('JSON 格式不正確，請檢查語法');
  }
};

const formatJson = () => {
  try {
    const parsed = JSON.parse(currentMenu.value);
    currentMenu.value = JSON.stringify(parsed, null, 2);
  } catch (e) {
    triggerToast('目前格式不正確，無法自動排版');
  }
};

const fetchUsageData = async () => {
  if (window.electronAPI.getModelUsage) {
    usageData.value = await window.electronAPI.getModelUsage();
  }
};

const openUsageModal = async () => {
  await fetchUsageData();
  showUsageModal.value = true;
};

const clearUsageData = async () => {
  const confirmed = await triggerConfirm({
    title: '清除用量紀錄',
    message: '確定要重置並清除所有 AI 模型的 Token 累積紀錄嗎？',
    confirmText: '清除',
    type: 'warning'
  });
  if (confirmed) {
    if (window.electronAPI.clearModelUsage) {
      usageData.value = await window.electronAPI.clearModelUsage();
      triggerToast('用量紀錄已重置');
    }
  }
};

onMounted(() => {
  loadApiKey();
  loadSelectedModel();
  loadShops();
});
</script>

<template>
  <div class="space-y-6">
    <!-- API Key 與 AI 模型設定區塊 -->
    <div class="relative z-30 bg-slate-800/80 backdrop-blur-md border border-slate-700/60 rounded-2xl p-6 shadow-xl space-y-4">
      <div class="flex justify-between items-center">
        <h3 class="text-xl font-bold text-white flex items-center gap-2 tracking-tight">
          <Key class="w-5.5 h-5.5 text-blue-400 stroke-[1.5]" />
          <span>API Key 與 AI 模型設定</span>
        </h3>
        <button 
          @click="openUsageModal"
          class="px-4 py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 rounded-xl font-normal text-sm transition-all flex items-center gap-1.5 shadow-sm"
        >
          <BarChart3 class="w-4 h-4 text-purple-400" />
          <span>AI 用量監控</span>
        </button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- API Key 輸入 -->
        <div>
          <label class="block text-sm font-normal text-slate-400 mb-2">API Key (僅儲存於此電腦)</label>
          <div class="flex gap-2">
            <div class="relative flex-1">
              <input 
                v-model="apiKey"
                :type="showKey ? 'text' : 'password'" 
                class="w-full bg-slate-900/50 border border-slate-700/60 rounded-xl pl-4 pr-10 py-2.5 text-white placeholder-slate-550 focus:outline-none focus:border-blue-500 transition-all font-mono text-base font-normal shadow-sm"
                placeholder="AIzaSy..."
                :disabled="isKeySaved"
              >
              <button 
                @click="showKey = !showKey"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <EyeOff v-if="showKey" class="w-4.5 h-4.5" />
                <Eye v-else class="w-4.5 h-4.5" />
              </button>
            </div>
            <button 
              v-if="!isKeySaved"
              @click="saveApiKey"
              class="px-5 py-2.5 bg-blue-600 hover:bg-blue-555 text-white border border-blue-500/10 rounded-xl font-normal text-sm transition-colors shadow-lg shadow-blue-500/10 whitespace-nowrap"
            >
              儲存 Key
            </button>
            <button 
              v-else
              @click="deleteApiKey"
              class="px-5 py-2.5 bg-rose-600/20 text-rose-405 border border-rose-500/20 hover:bg-rose-600 hover:text-white rounded-xl font-normal text-sm transition-colors whitespace-nowrap"
            >
              清除 Key
            </button>
          </div>
        </div>

        <!-- AI 模型選擇 -->
        <div>
          <div class="flex justify-between items-center mb-2">
            <label class="block text-sm font-normal text-slate-400 flex items-center gap-1.5">
              <Cpu class="w-4 h-4 text-purple-400" />
              <span>AI 模型選擇</span>
            </label>
            <button 
              type="button"
              @click="fetchModelsFromApi"
              :disabled="isFetchingModels"
              class="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors disabled:opacity-50"
              title="向 Google API 動態獲取最新可用模型清單"
            >
              <RefreshCw class="w-3.5 h-3.5" :class="isFetchingModels ? 'animate-spin' : ''" />
              <span>同步最新模型</span>
            </button>
          </div>
          <div class="space-y-2">
            <CustomSelect
              v-model="selectedModel"
              :options="modelOptions"
              option-label="label"
              option-value="id"
              placeholder="-- 選擇 Gemini 模型 --"
              @change="handleModelChange"
            />
            <input 
              v-if="isCustomModel"
              v-model="customModelName"
              @blur="handleCustomModelBlur"
              type="text"
              class="w-full bg-slate-900/50 border border-slate-700/60 rounded-xl px-3.5 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-all font-mono text-sm shadow-sm"
              placeholder="例如：gemini-3.6-pro"
            >
          </div>
        </div>
      </div>
    </div>

    <!-- 菜單辨識區塊 -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 relative z-10">
      
      <!-- 左側：圖片與操作 -->
      <div class="bg-slate-800/80 backdrop-blur-md border border-slate-700/60 rounded-2xl p-6 shadow-xl flex flex-col">
        <div class="mb-4">
          <label class="block text-sm font-normal text-slate-400 mb-2">選擇店家</label>
          <CustomSelect
            v-model="selectedShopId"
            :options="shopOptions"
            option-label="displayName"
            option-value="id"
            placeholder="-- 請選擇店家 --"
            @change="onShopChange"
          />
        </div>

        <div class="flex-1 min-h-[300px] border-2 border-dashed border-slate-700/60 rounded-xl flex flex-col items-center justify-center p-4 relative overflow-hidden bg-slate-900/30">
          <template v-if="!selectedShopId">
            <div class="text-slate-500 text-center flex flex-col items-center justify-center">
              <Store class="w-12 h-12 text-slate-650 mb-3 stroke-[1.5]" />
              <p class="text-sm font-normal">請先選擇店家</p>
            </div>
          </template>
          <template v-else-if="currentImage">
            <img :src="currentImage" class="w-full h-full object-contain" />
          </template>
          <template v-else>
            <div class="text-slate-500 text-center flex flex-col items-center justify-center">
              <ImageIcon class="w-12 h-12 text-slate-650 mb-3 stroke-[1.5]" />
              <p class="text-sm font-normal">此店家尚未上傳菜單圖片</p>
              <p class="text-xs text-slate-550 mt-1.5 leading-normal">請至「店家管理」上傳圖片</p>
            </div>
          </template>
        </div>

        <button 
          @click="scanMenu"
          :disabled="!currentImage || !isKeySaved || isScanning"
          class="mt-4 w-full py-3.5 rounded-xl font-normal text-base flex justify-center items-center gap-2 transition-all border border-transparent shadow-lg"
          :class="(!currentImage || !isKeySaved || isScanning) ? 'bg-slate-700/50 text-slate-500 cursor-not-allowed border-slate-600/30' : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-555 hover:to-blue-555 text-white shadow-purple-500/10'"
        >
          <Loader2 v-if="isScanning" class="w-5 h-5 animate-spin" />
          <Scan v-else class="w-5 h-5" />
          <span>{{ isScanning ? `正在使用 ${activeModelName} 辨識中...` : `開始辨識菜單 (${activeModelName})` }}</span>
        </button>
      </div>

      <!-- 右側：JSON 編輯器 -->
      <div class="bg-slate-800/80 backdrop-blur-md border border-slate-700/60 rounded-2xl p-6 shadow-xl flex flex-col">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-xl font-bold text-white flex items-center gap-2 tracking-tight">
            <FileJson class="w-5.5 h-5.5 text-blue-400 stroke-[1.5]" />
            <span>菜單資料 (JSON)</span>
          </h3>
          <div class="flex gap-2">
            <button 
              @click="formatJson"
              class="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 border border-slate-600 text-xs text-slate-200 rounded-lg transition-colors font-normal"
            >
              整理排版
            </button>
          </div>
        </div>

        <textarea 
          v-model="currentMenu"
          class="flex-1 w-full min-h-[400px] bg-slate-900/60 border border-slate-700/60 rounded-xl p-4 text-emerald-400 font-mono text-base focus:outline-none focus:border-blue-500 transition-all custom-scrollbar font-normal"
          placeholder="這裡會顯示 AI 辨識後的 JSON 結構。您也可以手動修改這裡的內容..."
          spellcheck="false"
        ></textarea>

        <button 
          @click="saveMenu"
          :disabled="!currentMenu.trim()"
          class="mt-4 w-full py-3.5 rounded-xl font-normal text-base transition-all disabled:bg-slate-700/50 disabled:text-slate-500 disabled:cursor-not-allowed bg-green-600 hover:bg-green-555 text-white shadow-lg border border-transparent flex items-center justify-center gap-2"
        >
          <Save class="w-4.5 h-4.5" />
          <span>儲存菜單資料</span>
        </button>
      </div>

    </div>

    <!-- AI 模型用量監控 Modal -->
    <Teleport to="body">
      <div v-if="showUsageModal" class="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md cursor-pointer" @click.self="showUsageModal = false">
        <div class="bg-slate-800 border border-slate-700/80 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
          <!-- Header -->
          <div class="px-6 py-4 border-b border-slate-700/60 flex items-center justify-between bg-slate-800/90">
            <div class="flex items-center gap-2 text-white font-bold text-lg">
              <Cpu class="w-5 h-5 text-purple-400" />
              <span>AI 模型用量監控儀表板</span>
            </div>
            <button @click="showUsageModal = false" class="text-slate-400 hover:text-white transition-colors p-1">
              <X class="w-5 h-5" />
            </button>
          </div>

          <!-- Body -->
          <div class="p-6 overflow-y-auto space-y-6 custom-scrollbar flex-1">
            <!-- 統計摘要卡片區 -->
            <div>
              <h4 class="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-1.5">
                <BarChart3 class="w-4 h-4 text-blue-400" />
                <span>各模型累積統計</span>
              </h4>
              <div v-if="!usageData.models || Object.keys(usageData.models).length === 0" class="p-6 text-center text-slate-400 bg-slate-900/40 rounded-xl border border-slate-700/40">
                尚未有任何 API 辨識紀錄
              </div>
              <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div v-for="(stat, modelName) in usageData.models" :key="modelName" class="bg-slate-900/60 border border-slate-700/60 rounded-xl p-4 space-y-2">
                  <div class="flex justify-between items-center pb-2 border-b border-slate-700/40">
                    <span class="font-mono font-semibold text-purple-300 text-sm truncate max-w-[200px]" :title="modelName">{{ modelName }}</span>
                    <span class="text-xs bg-purple-500/10 text-purple-300 border border-purple-500/20 px-2 py-0.5 rounded-md font-mono">{{ stat.totalCalls }} 次呼叫</span>
                  </div>
                  <div class="grid grid-cols-3 gap-2 text-center text-xs pt-1">
                    <div class="bg-slate-800/60 p-2 rounded-lg">
                      <div class="text-slate-400 text-[11px]">Input Tokens</div>
                      <div class="text-blue-300 font-mono font-semibold mt-0.5">{{ (stat.promptTokens || 0).toLocaleString() }}</div>
                    </div>
                    <div class="bg-slate-800/60 p-2 rounded-lg">
                      <div class="text-slate-400 text-[11px]">Output Tokens</div>
                      <div class="text-emerald-300 font-mono font-semibold mt-0.5">{{ (stat.candidateTokens || 0).toLocaleString() }}</div>
                    </div>
                    <div class="bg-slate-800/60 p-2 rounded-lg">
                      <div class="text-slate-400 text-[11px]">Total Tokens</div>
                      <div class="text-amber-300 font-mono font-semibold mt-0.5">{{ (stat.totalTokens || 0).toLocaleString() }}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 呼叫歷史 Log -->
            <div>
              <h4 class="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-1.5">
                <Layers class="w-4 h-4 text-purple-400" />
                <span>最近辨識紀錄 ({{ usageData.history?.length || 0 }} 筆)</span>
              </h4>
              <div v-if="!usageData.history || usageData.history.length === 0" class="p-6 text-center text-slate-400 bg-slate-900/40 rounded-xl border border-slate-700/40">
                暫無調用日誌
              </div>
              <div v-else class="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                <div v-for="log in usageData.history" :key="log.id" class="flex items-center justify-between text-xs bg-slate-900/40 border border-slate-700/40 rounded-lg p-3">
                  <div class="space-y-1">
                    <div class="flex items-center gap-2">
                      <span class="font-semibold text-white">{{ log.shopName }}</span>
                      <span class="font-mono text-[11px] text-purple-300 bg-purple-500/10 px-1.5 py-0.5 rounded">{{ log.model }}</span>
                      <span v-if="!log.success" class="text-rose-400 text-[11px] bg-rose-500/10 px-1.5 py-0.5 rounded">失敗</span>
                    </div>
                    <div class="text-slate-400 text-[11px]">
                      {{ new Date(log.timestamp).toLocaleString() }}
                    </div>
                  </div>
                  <div v-if="log.success" class="text-right font-mono">
                    <span class="text-amber-300 font-semibold">{{ (log.totalTokens || 0).toLocaleString() }} Tokens</span>
                    <div class="text-[10px] text-slate-400">
                      In: {{ (log.promptTokens || 0).toLocaleString() }} | Out: {{ (log.candidateTokens || 0).toLocaleString() }}
                    </div>
                  </div>
                  <div v-else class="text-right text-rose-400 text-[11px] truncate max-w-[150px]" :title="log.error">
                    {{ log.error }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="px-6 py-3.5 bg-slate-900/60 border-t border-slate-700/60 flex justify-between items-center">
            <button @click="clearUsageData" class="px-3.5 py-2 bg-rose-600/15 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 rounded-xl text-xs flex items-center gap-1.5 transition-colors">
              <Trash2 class="w-3.5 h-3.5" />
              <span>重置統計數據</span>
            </button>
            <button @click="showUsageModal = false" class="px-5 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-normal transition-colors">
              關閉
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(15, 23, 42, 0.5);
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(71, 85, 105, 0.8);
  border-radius: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(100, 116, 139, 1);
}
</style>
