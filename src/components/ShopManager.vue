<script setup>
import { ref, onMounted, inject, computed } from 'vue';
import { 
  Store, Coffee, Utensils, Pencil, Trash2, Inbox, Wrench, Plus, Minus, Search, 
  Image as ImageIcon, Phone, FileText, Check 
} from 'lucide-vue-next';
import ZoomableImageModal from './ZoomableImageModal.vue';

const shops = ref([]);
const isEditing = ref(false);
const editingShop = ref({ id: '', name: '', phone: '', note: '', weight: 1, category: 'drink' });
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
  editingShop.value = { id: '', name: '', phone: '', note: '', weight: 1, category: activeCategory.value };
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
      <div class="bg-slate-800/50 backdrop-blur-md border border-slate-700/60 rounded-2xl p-6 shadow-xl">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-2xl font-bold text-white flex items-center gap-2 tracking-tight">
            <Store class="w-6 h-6 text-blue-400 stroke-[1.5]" />
            <span>店家列表</span>
          </h2>
          
          <!-- Category Tabs -->
          <div class="flex bg-slate-900/50 p-1.5 rounded-xl border border-slate-700/50">
            <button 
              @click="activeCategory = 'drink'"
              class="px-5 py-2.5 rounded-lg text-base font-normal transition-all flex items-center gap-2"
              :class="activeCategory === 'drink' ? 'bg-blue-600/30 text-blue-300 border border-blue-500/20 shadow-lg shadow-blue-500/5' : 'text-slate-400 hover:text-white'"
            >
              <Coffee class="w-4.5 h-4.5" />
              <span>飲料</span>
            </button>
            <button 
              @click="activeCategory = 'food'"
              class="px-5 py-2.5 rounded-lg text-base font-normal transition-all flex items-center gap-2"
              :class="activeCategory === 'food' ? 'bg-orange-600/30 text-orange-300 border border-orange-500/20 shadow-lg shadow-orange-500/5' : 'text-slate-400 hover:text-white'"
            >
              <Utensils class="w-4.5 h-4.5" />
              <span>食物</span>
            </button>
          </div>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div 
            v-for="shop in filteredShops" 
            :key="shop.id"
            class="bg-slate-700/20 p-5 rounded-xl border border-slate-700/50 hover:border-blue-500/30 hover:bg-slate-700/25 transition-all group relative flex flex-col justify-between"
          >
            <div>
              <div class="flex justify-between items-start">
                <div>
                  <h3 class="font-normal text-lg text-white mb-2">{{ shop.name }}</h3>
                  <div class="text-slate-400 text-sm flex items-center gap-1.5 mb-1.5">
                    <Phone class="w-3.5 h-3.5 text-slate-500" />
                    <span>{{ shop.phone || '無電話' }}</span>
                  </div>
                  <div v-if="shop.note" class="text-slate-400 text-xs flex items-center gap-1.5">
                    <FileText class="w-3.5 h-3.5 text-slate-500" />
                    <span>{{ shop.note }}</span>
                  </div>
                </div>
                
                <div class="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    @click="editShop(shop)"
                    class="p-2 bg-blue-600/20 text-blue-400 rounded-lg hover:bg-blue-600 hover:text-white transition-colors border border-blue-500/10"
                    title="編輯"
                  >
                    <Pencil class="w-4 h-4" />
                  </button>
                  <button 
                    @click="deleteShop(shop.id)"
                    class="p-2 bg-rose-600/20 text-rose-400 rounded-lg hover:bg-rose-600 hover:text-white transition-colors border border-rose-500/10"
                    title="刪除"
                  >
                    <Trash2 class="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
            
            <div class="mt-4 flex justify-between items-center pt-3 border-t border-slate-700/30">
              <span class="text-xs text-slate-500">權重: {{ shop.weight }}</span>
              <span class="text-xs text-slate-500" :class="shop.category === 'drink' ? 'text-blue-400/70' : 'text-orange-400/70'">
                {{ shop.category === 'drink' ? '飲料' : '食物' }}
              </span>
            </div>
          </div>
          
          <div v-if="filteredShops.length === 0" class="col-span-full text-center py-14 text-slate-500 flex flex-col items-center justify-center">
            <Inbox class="w-12 h-12 text-slate-600 mb-3 stroke-[1.5]" />
            <p class="text-sm">這個分類還沒有店家</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Right: Edit Form -->
    <div class="lg:col-span-4">
      <div class="bg-slate-800/80 backdrop-blur-md border border-slate-700/60 rounded-2xl p-6 shadow-2xl sticky top-6">
        <h3 class="text-xl font-bold text-white mb-6 flex items-center gap-2 tracking-tight">
          <Wrench class="w-5.5 h-5.5 text-blue-400 stroke-[1.5]" />
          <span>{{ isEditing ? '編輯店家' : '新增店家' }}</span>
        </h3>
        
        <form @submit.prevent="saveShop" class="space-y-4">
          <!-- Category Selection -->
          <div>
            <label class="block text-sm font-normal text-slate-400 mb-2">分類</label>
            <div class="grid grid-cols-2 gap-3">
              <label class="cursor-pointer">
                <input type="radio" v-model="editingShop.category" value="drink" class="peer sr-only">
                <div class="text-center py-2.5 rounded-lg border border-slate-700 bg-slate-900/50 text-slate-400 peer-checked:bg-blue-600/20 peer-checked:border-blue-500 peer-checked:text-blue-400 transition-all flex items-center justify-center gap-1.5 text-sm">
                  <Coffee class="w-4 h-4" />
                  <span>飲料</span>
                </div>
              </label>
              <label class="cursor-pointer">
                <input type="radio" v-model="editingShop.category" value="food" class="peer sr-only">
                <div class="text-center py-2.5 rounded-lg border border-slate-700 bg-slate-900/50 text-slate-400 peer-checked:bg-orange-600/20 peer-checked:border-orange-500 peer-checked:text-orange-400 transition-all flex items-center justify-center gap-1.5 text-sm">
                  <Utensils class="w-4 h-4" />
                  <span>食物</span>
                </div>
              </label>
            </div>
          </div>

          <div>
            <label class="block text-sm font-normal text-slate-400 mb-1.5">店名</label>
            <input 
              v-model="editingShop.name"
              type="text" 
              required
              class="w-full bg-slate-900/50 border border-slate-700/60 rounded-xl px-4 py-2.5 text-white placeholder-slate-550 focus:outline-none focus:border-blue-500 transition-all text-base font-normal shadow-sm" 
              placeholder="例如：50嵐"
            >
          </div>
          
          <div>
            <label class="block text-sm font-normal text-slate-400 mb-1.5">電話</label>
            <input 
              v-model="editingShop.phone"
              type="text" 
              class="w-full bg-slate-900/50 border border-slate-700/60 rounded-xl px-4 py-2.5 text-white placeholder-slate-550 focus:outline-none focus:border-blue-500 transition-all text-base font-normal shadow-sm" 
              placeholder="03-xxxx-xxxx"
            >
          </div>

          <div>
            <label class="block text-sm font-normal text-slate-400 mb-1.5">備註 (分店)</label>
            <input 
              v-model="editingShop.note"
              type="text" 
              class="w-full bg-slate-900/50 border border-slate-700/60 rounded-xl px-4 py-2.5 text-white placeholder-slate-550 focus:outline-none focus:border-blue-500 transition-all text-base font-normal shadow-sm" 
              placeholder="例如：竹科店"
            >
          </div>

          <div>
            <label class="block text-sm font-normal text-slate-400 mb-2">權重 (機率)</label>
            <div class="flex items-center gap-4">
              <button 
                type="button" 
                @click="editingShop.weight = Math.max(1, (editingShop.weight || 1) - 1)" 
                class="w-10 h-10 rounded-xl bg-slate-700 hover:bg-slate-600 text-white flex items-center justify-center transition-colors border border-slate-600"
              >
                <Minus class="w-4 h-4" />
              </button>
              <span class="text-xl font-normal text-white w-8 text-center">{{ editingShop.weight || 1 }}</span>
              <button 
                type="button" 
                @click="editingShop.weight = (editingShop.weight || 1) + 1" 
                class="w-10 h-10 rounded-xl bg-slate-700 hover:bg-slate-600 text-white flex items-center justify-center transition-colors border border-slate-600"
              >
                <Plus class="w-4 h-4" />
              </button>
            </div>
            <p class="text-xs text-slate-500 mt-1.5 leading-normal">權重越高，被抽中的機率越高</p>
          </div>

          <div>
            <label class="block text-sm font-normal text-slate-400 mb-2">菜單圖片</label>
            
            <!-- Existing Image Preview -->
            <div v-if="currentMenuImage && !selectedImagePath" class="mb-3">
               <div 
                 class="relative aspect-[3/4] rounded-xl overflow-hidden border border-slate-700/60 group cursor-zoom-in"
                 @click="isMenuModalOpen = true"
               >
                 <img :src="currentMenuImage" class="w-full h-full object-cover" />
                 <div class="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <span class="text-white font-normal bg-black/50 px-3 py-1 rounded-full text-xs flex items-center gap-1">
                      <Search class="w-3.5 h-3.5" />
                      <span>放大</span>
                    </span>
                 </div>
               </div>
               <button 
                 type="button" 
                 @click="selectImage"
                 class="mt-2 text-sm text-blue-400 hover:text-blue-300 underline font-normal"
               >
                 更換圖片
               </button>
            </div>

            <!-- Upload Box -->
            <div 
              v-else
              @click="selectImage"
              class="w-full h-32 border-2 border-dashed border-slate-700/60 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-slate-700/20 transition-all group p-4"
            >
              <div v-if="selectedImagePath" class="text-center px-2">
                <div class="text-green-400 text-sm mb-1 font-normal flex items-center justify-center gap-1.5">
                  <Check class="w-4 h-4" />
                  <span>已選擇新圖片</span>
                </div>
                <div class="text-xs text-slate-500 break-all font-mono">{{ selectedImagePath }}</div>
              </div>
              <div v-else class="text-center text-slate-500 group-hover:text-slate-350 flex flex-col items-center justify-center">
                <ImageIcon class="w-8 h-8 text-slate-600 mb-2 stroke-[1.5]" />
                <div class="text-sm font-normal">點擊選擇圖片</div>
              </div>
            </div>
          </div>

          <div class="flex gap-3 pt-4">
            <button 
              v-if="isEditing"
              type="button"
              @click="resetForm"
              class="flex-1 py-3 bg-slate-700 hover:bg-slate-655 text-white border border-slate-600 rounded-xl font-normal text-base transition-colors"
            >
              取消
            </button>
            <button 
              type="submit"
              class="flex-1 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-550 hover:to-indigo-550 text-white rounded-xl font-normal text-base shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 transform hover:-translate-y-0.5 transition-all duration-200"
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
