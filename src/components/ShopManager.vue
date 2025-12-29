<script setup>
import { ref, onMounted, inject, computed } from 'vue';
import ZoomableImageModal from './ZoomableImageModal.vue';

const shops = ref([]);
const isEditing = ref(false);
const editingShop = ref({ id: '', name: '', phone: '', weight: 1, category: 'drink' });
const selectedImagePath = ref(null);
const currentMenuImage = ref(null);
const isMenuModalOpen = ref(false);
const activeCategory = ref('drink');
const triggerToast = inject('triggerToast');
const triggerConfirm = inject('triggerConfirm');

const loadShops = async () => {
  try {
    const allShops = await window.electronAPI.getShops();
    // Ensure category exists
    shops.value = allShops.map(s => ({ ...s, category: s.category || 'drink' }));
  } catch (error) {
    console.error('Failed to load shops:', error);
  }
};

const filteredShops = computed(() => {
  return shops.value.filter(s => s.category === activeCategory.value);
});

const resetForm = () => {
  isEditing.value = false;
  // Default to current active category for new shops
  editingShop.value = { id: '', name: '', phone: '', weight: 1, category: activeCategory.value };
  selectedImagePath.value = null;
  currentMenuImage.value = null;
};

const editShop = async (shop) => {
  isEditing.value = true;
  editingShop.value = { ...shop };
  selectedImagePath.value = null;
  currentMenuImage.value = null;
  
  // Load existing image
  try {
    const image = await window.electronAPI.getMenuImage(shop.id);
    if (image) {
      currentMenuImage.value = image;
    }
  } catch (error) {
    console.error('Failed to load menu image:', error);
  }
};

const selectImage = async () => {
  const path = await window.electronAPI.selectImage();
  if (path) {
    selectedImagePath.value = path;
  }
};

const saveShop = async () => {
  try {
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

onMounted(() => {
  loadShops();
});
</script>

<template>
  <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
    <!-- Left: Shop List -->
    <div class="lg:col-span-8">
      <div class="bg-slate-800/50 backdrop-blur-md border border-slate-700 rounded-2xl p-6 shadow-xl">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-2xl font-bold text-white flex items-center gap-2">
            <span>🏪</span> 店家列表
          </h2>
          
          <!-- Category Tabs -->
          <div class="flex bg-slate-900/50 p-1 rounded-xl">
            <button 
              @click="activeCategory = 'drink'"
              class="px-4 py-2 rounded-lg text-sm font-bold transition-all"
              :class="activeCategory === 'drink' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'"
            >
              🥤 飲料
            </button>
            <button 
              @click="activeCategory = 'food'"
              class="px-4 py-2 rounded-lg text-sm font-bold transition-all"
              :class="activeCategory === 'food' ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'"
            >
              🍱 食物
            </button>
          </div>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div 
            v-for="shop in filteredShops" 
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
          
          <div v-if="filteredShops.length === 0" class="col-span-full text-center py-10 text-slate-500">
            <div class="text-4xl mb-2">📭</div>
            <p>這個分類還沒有店家</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Right: Edit Form -->
    <div class="lg:col-span-4">
      <div class="bg-slate-800/80 backdrop-blur-md border border-slate-600 rounded-2xl p-6 shadow-2xl sticky top-6">
        <h3 class="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <span>🛠️</span> {{ isEditing ? '編輯店家' : '新增店家' }}
        </h3>
        
        <form @submit.prevent="saveShop" class="space-y-4">
          <!-- Category Selection -->
          <div>
            <label class="block text-sm font-medium text-slate-400 mb-2">分類</label>
            <div class="grid grid-cols-2 gap-3">
              <label class="cursor-pointer">
                <input type="radio" v-model="editingShop.category" value="drink" class="peer sr-only">
                <div class="text-center py-2 rounded-lg border border-slate-600 bg-slate-900/50 text-slate-400 peer-checked:bg-blue-600/20 peer-checked:border-blue-500 peer-checked:text-blue-400 transition-all">
                  🥤 飲料
                </div>
              </label>
              <label class="cursor-pointer">
                <input type="radio" v-model="editingShop.category" value="food" class="peer sr-only">
                <div class="text-center py-2 rounded-lg border border-slate-600 bg-slate-900/50 text-slate-400 peer-checked:bg-orange-600/20 peer-checked:border-orange-500 peer-checked:text-orange-400 transition-all">
                  🍱 食物
                </div>
              </label>
            </div>
          </div>

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
            
            <!-- Existing Image Preview -->
            <div v-if="currentMenuImage && !selectedImagePath" class="mb-3">
               <div 
                 class="relative aspect-[3/4] rounded-lg overflow-hidden border border-slate-600 group cursor-zoom-in"
                 @click="isMenuModalOpen = true"
               >
                 <img :src="currentMenuImage" class="w-full h-full object-cover" />
                 <div class="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <span class="text-white font-bold bg-black/50 px-3 py-1 rounded-full text-sm">🔍 放大</span>
                 </div>
               </div>
               <button 
                 type="button" 
                 @click="selectImage"
                 class="mt-2 text-sm text-blue-400 hover:text-blue-300 underline"
               >
                 更換圖片
               </button>
            </div>

            <!-- Upload Box -->
            <div 
              v-else
              @click="selectImage"
              class="w-full h-32 border-2 border-dashed border-slate-600 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-slate-700/30 transition-all group"
            >
              <div v-if="selectedImagePath" class="text-center px-4">
                <div class="text-green-400 mb-1">✅ 已選擇新圖片</div>
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
    </div>

    <!-- Menu Modal -->
    <ZoomableImageModal 
      :is-open="isMenuModalOpen" 
      :image-src="currentMenuImage" 
      @close="isMenuModalOpen = false" 
    />
  </div>
</template>
