<script setup>
import { ref, onMounted, inject, computed } from 'vue';
import CustomSelect from './CustomSelect.vue';
import { Key, Eye, EyeOff, Store, Image as ImageIcon, Loader2, Scan, FileJson, Save } from 'lucide-vue-next';

const triggerToast = inject('triggerToast');
const triggerConfirm = inject('triggerConfirm');

const apiKey = ref('');
const isKeySaved = ref(false);
const showKey = ref(false);

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
    <div class="bg-slate-800/80 backdrop-blur-md border border-slate-700/60 rounded-2xl p-6 shadow-xl">
      <h3 class="text-xl font-bold text-white mb-4 flex items-center gap-2 tracking-tight">
        <Key class="w-5.5 h-5.5 text-blue-400 stroke-[1.5]" />
        <span>API Key 設定</span>
      </h3>
      <div class="flex gap-4 items-end">
        <div class="flex-1">
          <label class="block text-sm font-normal text-slate-400 mb-2">API Key (僅儲存於此電腦)</label>
          <div class="relative">
            <input 
              v-model="apiKey"
              :type="showKey ? 'text' : 'password'" 
              class="w-full bg-slate-900/50 border border-slate-700/60 rounded-xl pl-4 pr-12 py-2.5 text-white placeholder-slate-550 focus:outline-none focus:border-blue-500 transition-all font-mono text-base font-normal shadow-sm"
              placeholder="AIzaSy..."
              :disabled="isKeySaved"
            >
            <button 
              @click="showKey = !showKey"
              class="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <EyeOff v-if="showKey" class="w-4.5 h-4.5" />
              <Eye v-else class="w-4.5 h-4.5" />
            </button>
          </div>
        </div>
        <div class="flex gap-2">
          <button 
            v-if="!isKeySaved"
            @click="saveApiKey"
            class="px-6 py-2.5 bg-blue-600 hover:bg-blue-555 text-white border border-blue-500/10 rounded-xl font-normal text-base transition-colors shadow-lg shadow-blue-500/10"
          >
            儲存 Key
          </button>
          <button 
            v-else
            @click="deleteApiKey"
            class="px-6 py-2.5 bg-rose-600/20 text-rose-405 border border-rose-500/20 hover:bg-rose-600 hover:text-white rounded-xl font-normal text-base transition-colors"
          >
            清除 Key
          </button>
        </div>
      </div>
    </div>

    <!-- 菜單辨識區塊 -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      
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
          :class="(!currentImage || !isKeySaved || isScanning) ? 'bg-slate-700/50 text-slate-500 cursor-not-allowed border-slate-600/30' : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-550 hover:to-blue-555 text-white shadow-purple-500/10'"
        >
          <Loader2 v-if="isScanning" class="w-5 h-5 animate-spin" />
          <Scan v-else class="w-5 h-5" />
          <span>{{ isScanning ? '正在努力辨識中... (約需 1~2 分鐘)' : '開始辨識菜單' }}</span>
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
