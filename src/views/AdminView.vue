<script setup>
import { ref, inject, onMounted } from 'vue';
import ShopManager from '../components/ShopManager.vue';
import MemberManager from '../components/MemberManager.vue';
import MenuManager from '../components/MenuManager.vue';

const activeTab = ref('shops'); // 'shops', 'members', 'settings'
const triggerToast = inject('triggerToast');
const triggerConfirm = inject('triggerConfirm');

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
  loadDataPath();
});
</script>

<template>
  <div class="w-full max-w-6xl mx-auto">
    <!-- Tabs -->
    <div class="flex gap-4 mb-8 border-b border-slate-700 pb-1">
      <button 
        @click="activeTab = 'shops'"
        class="px-6 py-3 font-bold text-lg transition-all border-b-2"
        :class="activeTab === 'shops' ? 'text-blue-400 border-blue-400' : 'text-slate-400 border-transparent hover:text-white'"
      >
        店家管理
      </button>
      <button 
        @click="activeTab = 'menus'"
        class="px-6 py-3 font-bold text-lg transition-all border-b-2"
        :class="activeTab === 'menus' ? 'text-blue-400 border-blue-400' : 'text-slate-400 border-transparent hover:text-white'"
      >
        菜單管理
      </button>
      <button 
        @click="activeTab = 'settings'"
        class="px-6 py-3 font-bold text-lg transition-all border-b-2"
        :class="activeTab === 'settings' ? 'text-blue-400 border-blue-400' : 'text-slate-400 border-transparent hover:text-white'"
      >
        系統設定
      </button>
      <button 
        @click="activeTab = 'members'"
        class="px-6 py-3 font-bold text-lg transition-all border-b-2"
        :class="activeTab === 'members' ? 'text-blue-400 border-blue-400' : 'text-slate-400 border-transparent hover:text-white'"
      >
        成員管理
      </button>
    </div>

    <!-- Content -->
    <div v-if="activeTab === 'shops'">
      <ShopManager />
    </div>

    <div v-if="activeTab === 'members'">
      <MemberManager />
    </div>

    <div v-if="activeTab === 'menus'">
      <MenuManager />
    </div>

    <div v-if="activeTab === 'settings'">
      <div class="max-w-2xl mx-auto bg-slate-800/80 backdrop-blur-md border border-slate-600 rounded-2xl p-8 shadow-2xl">
        <h3 class="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <span>⚙️</span> 系統設定
        </h3>
        
        <div class="space-y-6">
          <div>
            <label class="block text-sm font-medium text-slate-400 mb-2">資料儲存路徑</label>
            <div class="bg-slate-900/50 p-4 rounded-xl border border-slate-700 text-sm text-slate-300 break-all font-mono mb-4 flex items-center gap-3">
              <span class="text-2xl">📂</span>
              {{ currentDataPath || '讀取中...' }}
            </div>
            <button 
              @click="changeDataPath"
              class="w-full py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold transition-colors shadow-lg"
            >
              更改資料夾 (設定共用路徑)
            </button>
            <p class="text-sm text-slate-500 mt-3 leading-relaxed">
              設定後請重啟應用程式。<br>
              若要與同事共用資料，請選擇網路磁碟機 (如 Z:\) 或雲端同步資料夾 (如 Dropbox)。
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
