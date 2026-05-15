<script setup>
import { ref, onMounted, inject } from 'vue';

const triggerToast = inject('triggerToast');
const triggerConfirm = inject('triggerConfirm');

const apiKey = ref('');
const isKeySaved = ref(false);
const showKey = ref(false);

const shops = ref([]);
const selectedShopId = ref('');
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
      apiKey: apiKey.value
    });

    if (result.success) {
      currentMenu.value = JSON.stringify(result.data, null, 2);
      triggerToast('辨識完成！請校對後儲存');
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

// 格式化 JSON 幫助排版
const formatJson = () => {
  try {
    const parsed = JSON.parse(currentMenu.value);
    currentMenu.value = JSON.stringify(parsed, null, 2);
  } catch (e) {
    triggerToast('目前格式不正確，無法自動排版');
  }
};

onMounted(() => {
  loadApiKey();
  loadShops();
});
</script>

<template>
  <div class="space-y-6">
    <!-- API Key 設定區塊 -->
    <div class="bg-slate-800/80 backdrop-blur-md border border-slate-600 rounded-2xl p-6 shadow-xl">
      <h3 class="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <span>🔑</span>API Key 設定
      </h3>
      <div class="flex gap-4 items-end">
        <div class="flex-1">
          <label class="block text-sm font-medium text-slate-400 mb-2">API Key (僅儲存於此電腦)</label>
          <div class="relative">
            <input 
              v-model="apiKey"
              :type="showKey ? 'text' : 'password'" 
              class="w-full bg-slate-900/50 border border-slate-600 rounded-lg pl-4 pr-12 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              placeholder="AIzaSy..."
              :disabled="isKeySaved"
            >
            <button 
              @click="showKey = !showKey"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              {{ showKey ? '🙈' : '👁️' }}
            </button>
          </div>
        </div>
        <div class="flex gap-2">
          <button 
            v-if="!isKeySaved"
            @click="saveApiKey"
            class="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition-colors"
          >
            儲存 Key
          </button>
          <button 
            v-else
            @click="deleteApiKey"
            class="px-6 py-2.5 bg-rose-600/20 text-rose-400 hover:bg-rose-600 hover:text-white rounded-lg font-bold transition-colors"
          >
            清除 Key
          </button>
        </div>
      </div>
    </div>

    <!-- 菜單辨識區塊 -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      
      <!-- 左側：圖片與操作 -->
      <div class="bg-slate-800/80 backdrop-blur-md border border-slate-600 rounded-2xl p-6 shadow-xl flex flex-col">
        <div class="mb-4">
          <label class="block text-sm font-medium text-slate-400 mb-2">選擇店家</label>
          <select 
            v-model="selectedShopId" 
            @change="onShopChange"
            class="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">-- 請選擇店家 --</option>
            <option v-for="shop in shops" :key="shop.id" :value="shop.id">
              {{ shop.name }} ({{ shop.category === 'drink' ? '飲料' : '食物' }})
            </option>
          </select>
        </div>

        <div class="flex-1 min-h-[300px] border-2 border-dashed border-slate-600 rounded-xl flex flex-col items-center justify-center p-2 relative overflow-hidden bg-slate-900/30">
          <template v-if="!selectedShopId">
            <div class="text-slate-500 text-center">
              <div class="text-3xl mb-2">🏪</div>
              <p>請先選擇店家</p>
            </div>
          </template>
          <template v-else-if="currentImage">
            <img :src="currentImage" class="w-full h-full object-contain" />
          </template>
          <template v-else>
            <div class="text-slate-500 text-center">
              <div class="text-3xl mb-2">🖼️</div>
              <p>此店家尚未上傳菜單圖片</p>
              <p class="text-xs mt-1">請至「店家管理」上傳圖片</p>
            </div>
          </template>
        </div>

        <button 
          @click="scanMenu"
          :disabled="!currentImage || !isKeySaved || isScanning"
          class="mt-4 w-full py-3 rounded-xl font-bold flex justify-center items-center gap-2 transition-all"
          :class="(!currentImage || !isKeySaved || isScanning) ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-lg'"
        >
          <span v-if="isScanning" class="animate-spin text-xl">⏳</span>
          <span v-else class="text-xl">✨</span>
          {{ isScanning ? 'AI 正在努力辨識中 (約需 10~20 秒)...' : '開始 AI 辨識菜單' }}
        </button>
      </div>

      <!-- 右側：JSON 編輯器 -->
      <div class="bg-slate-800/80 backdrop-blur-md border border-slate-600 rounded-2xl p-6 shadow-xl flex flex-col">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-xl font-bold text-white flex items-center gap-2">
            <span>📝</span> 菜單資料 (JSON)
          </h3>
          <div class="flex gap-2">
            <button 
              @click="formatJson"
              class="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-xs text-white rounded transition-colors"
            >
              整理排版
            </button>
          </div>
        </div>

        <textarea 
          v-model="currentMenu"
          class="flex-1 w-full min-h-[400px] bg-slate-900/80 border border-slate-600 rounded-xl p-4 text-green-400 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 custom-scrollbar"
          placeholder="這裡會顯示 AI 辨識後的 JSON 結構。您也可以手動修改這裡的內容..."
          spellcheck="false"
        ></textarea>

        <button 
          @click="saveMenu"
          :disabled="!currentMenu.trim()"
          class="mt-4 w-full py-3 rounded-xl font-bold transition-all disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed bg-green-600 hover:bg-green-500 text-white shadow-lg"
        >
          💾 儲存菜單資料
        </button>
      </div>

    </div>
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
