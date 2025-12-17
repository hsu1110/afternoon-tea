<script setup>
import { ref, onMounted, inject } from 'vue';

const shops = ref([]);
const isEditing = ref(false);
const editingShop = ref({ id: '', name: '', phone: '', weight: 1 });
const selectedImagePath = ref(null);
const triggerToast = inject('triggerToast');
const triggerConfirm = inject('triggerConfirm');

const loadShops = async () => {
  try {
    shops.value = await window.electronAPI.getShops();
  } catch (error) {
    console.error('Failed to load shops:', error);
  }
};

const resetForm = () => {
  isEditing.value = false;
  editingShop.value = { id: '', name: '', phone: '', weight: 1 };
  selectedImagePath.value = null;
};

const editShop = (shop) => {
  isEditing.value = true;
  editingShop.value = { ...shop };
  selectedImagePath.value = null; // Reset image path, only update if user selects new one
};

const selectImage = async () => {
  const path = await window.electronAPI.selectImage();
  if (path) {
    selectedImagePath.value = path;
  }
};

const saveShop = async () => {
  try {
    // ID generation is handled by backend if missing

    
    // Deep copy to avoid Proxy cloning error
    const shopData = JSON.parse(JSON.stringify(editingShop.value));
    await window.electronAPI.saveShop(shopData, selectedImagePath.value);
    
    triggerToast('儲存成功！');
    resetForm();
    loadShops();
  } catch (error) {
    console.error('Failed to save shop:', error);
    triggerToast('儲存失敗');
  }
};

const deleteShop = async (id) => {
  const confirmed = await triggerConfirm({
    title: '刪除店家',
    message: '確定要刪除這家店嗎？此操作無法復原。',
    confirmText: '刪除',
    type: 'danger'
  });
  
  if (!confirmed) return;
  
  try {
    await window.electronAPI.deleteShop(id);
    loadShops();
    triggerToast('已刪除店家');
  } catch (error) {
    console.error('Failed to delete shop:', error);
    triggerToast('刪除失敗');
  }
};

const currentDataPath = ref('');

const loadDataPath = async () => {
  try {
    currentDataPath.value = await window.electronAPI.getDataPath();
  } catch (error) {
    console.error('Failed to load data path:', error);
  }
};

const changeDataPath = async () => {
  try {
    const result = await window.electronAPI.setDataPath();
    if (result.success) {
      currentDataPath.value = result.path;
      await triggerConfirm({
        title: '設定已儲存',
        message: result.message,
        confirmText: '好',
        type: 'success'
      });
    }
  } catch (error) {
    console.error('Failed to set data path:', error);
    triggerToast('設定失敗');
  }
};

onMounted(() => {
  loadShops();
  loadDataPath();
});
</script>

<template>
  <div class="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8">
    
    <!-- Left: Shop List -->
    <div class="lg:col-span-8">
      <div class="bg-slate-800/50 backdrop-blur-md border border-slate-700 rounded-2xl p-6 shadow-xl">
        <h2 class="text-2xl font-bold text-white mb-6 flex items-center gap-2">
          <span>🏪</span> 店家列表
        </h2>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div 
            v-for="shop in shops" 
            :key="shop.id"
            class="bg-slate-700/30 p-4 rounded-xl border border-slate-600/50 hover:border-blue-500/50 transition-all group relative"
          >
            <div class="flex justify-between items-start">
              <div>
                <h3 class="font-bold text-lg text-white">{{ shop.name }}</h3>
                <p class="text-slate-400 text-sm">📞 {{ shop.phone }}</p>
                <div class="mt-2 text-xs bg-slate-700 inline-block px-2 py-1 rounded text-slate-300">
                  權重: {{ shop.weight }}
                </div>
              </div>
              <div class="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  @click="editShop(shop)"
                  class="p-2 bg-blue-600/20 text-blue-400 rounded-lg hover:bg-blue-600 hover:text-white transition-colors"
                >
                  ✏️
                </button>
                <button 
                  @click="deleteShop(shop.id)"
                  class="p-2 bg-rose-600/20 text-rose-400 rounded-lg hover:bg-rose-600 hover:text-white transition-colors"
                >
                  🗑️
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Right: Edit Form & Settings -->
    <div class="lg:col-span-4 space-y-8">
      <!-- Edit Form -->
      <div class="bg-slate-800/80 backdrop-blur-md border border-slate-600 rounded-2xl p-6 shadow-2xl sticky top-6">
        <h3 class="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <span>🛠️</span> {{ isEditing ? '編輯店家' : '新增店家' }}
        </h3>
        
        <form @submit.prevent="saveShop" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-slate-400 mb-1">店名</label>
            <input 
              v-model="editingShop.name"
              type="text" 
              required
              class="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
              placeholder="例如：50嵐"
            >
          </div>
          
          <div>
            <label class="block text-sm font-medium text-slate-400 mb-1">電話</label>
            <input 
              v-model="editingShop.phone"
              type="text" 
              class="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
              placeholder="03-xxxx-xxxx"
            >
          </div>

          <div>
            <label class="block text-sm font-medium text-slate-400 mb-1">權重 (機率)</label>
            <div class="flex items-center gap-4">
              <button type="button" @click="editingShop.weight = Math.max(1, (editingShop.weight || 1) - 1)" class="w-10 h-10 rounded bg-slate-700 hover:bg-slate-600 text-white font-bold">-</button>
              <span class="text-xl font-bold text-white w-8 text-center">{{ editingShop.weight || 1 }}</span>
              <button type="button" @click="editingShop.weight = (editingShop.weight || 1) + 1" class="w-10 h-10 rounded bg-slate-700 hover:bg-slate-600 text-white font-bold">+</button>
            </div>
            <p class="text-xs text-slate-500 mt-1">權重越高，被抽中的機率越高</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-slate-400 mb-1">菜單圖片</label>
            <div 
              @click="selectImage"
              class="w-full h-32 border-2 border-dashed border-slate-600 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-slate-700/30 transition-all group"
            >
              <div v-if="selectedImagePath" class="text-center px-4">
                <div class="text-green-400 mb-1">✅ 已選擇圖片</div>
                <div class="text-xs text-slate-500 break-all">{{ selectedImagePath }}</div>
              </div>
              <div v-else class="text-center text-slate-500 group-hover:text-slate-300">
                <div class="text-2xl mb-2">🖼️</div>
                <div class="text-sm">點擊選擇圖片</div>
              </div>
            </div>
          </div>

          <div class="flex gap-3 pt-4">
            <button 
              v-if="isEditing"
              type="button"
              @click="resetForm"
              class="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold transition-colors"
            >
              取消
            </button>
            <button 
              type="submit"
              class="flex-1 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 transform hover:-translate-y-0.5 transition-all duration-200"
            >
              {{ isEditing ? '儲存修改' : '新增店家' }}
            </button>
          </div>
        </form>
      </div>

      <!-- Settings Section -->
      <div class="bg-slate-800/80 backdrop-blur-md border border-slate-600 rounded-2xl p-6 shadow-2xl">
        <h3 class="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <span>⚙️</span> 系統設定
        </h3>
        
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-slate-400 mb-2">資料儲存路徑</label>
            <div class="bg-slate-900/50 p-3 rounded-lg border border-slate-700 text-xs text-slate-300 break-all font-mono mb-2">
              {{ currentDataPath || '讀取中...' }}
            </div>
            <button 
              @click="changeDataPath"
              class="w-full py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold transition-colors text-sm"
            >
              📂 更改資料夾 (設定共用路徑)
            </button>
            <p class="text-xs text-slate-500 mt-2">
              設定後請重啟應用程式。若要多人共用，請選擇網路共用資料夾。
            </p>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>
