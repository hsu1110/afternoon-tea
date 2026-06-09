<script setup>
import { ref, inject, onMounted } from 'vue';
import { Store, Users, FileJson, Settings, FolderOpen } from 'lucide-vue-next';
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
        class="px-5 py-3 font-normal text-lg transition-all border-b-2 flex items-center gap-2"
        :class="activeTab === 'shops' ? 'text-blue-400 border-blue-400' : 'text-slate-400 border-transparent hover:text-white'"
      >
        <Store class="w-5 h-5 stroke-[1.5]" />
        <span>店家管理</span>
      </button>
      <button 
        @click="activeTab = 'menus'"
        class="px-5 py-3 font-normal text-lg transition-all border-b-2 flex items-center gap-2"
        :class="activeTab === 'menus' ? 'text-blue-400 border-blue-400' : 'text-slate-400 border-transparent hover:text-white'"
      >
        <FileJson class="w-5 h-5 stroke-[1.5]" />
        <span>菜單管理</span>
      </button>
      <button 
        @click="activeTab = 'settings'"
        class="px-5 py-3 font-normal text-lg transition-all border-b-2 flex items-center gap-2"
        :class="activeTab === 'settings' ? 'text-blue-400 border-blue-400' : 'text-slate-400 border-transparent hover:text-white'"
      >
        <Settings class="w-5 h-5 stroke-[1.5]" />
        <span>系統設定</span>
      </button>
      <button 
        @click="activeTab = 'members'"
        class="px-5 py-3 font-normal text-lg transition-all border-b-2 flex items-center gap-2"
        :class="activeTab === 'members' ? 'text-blue-400 border-blue-400' : 'text-slate-400 border-transparent hover:text-white'"
      >
        <Users class="w-5 h-5 stroke-[1.5]" />
        <span>成員管理</span>
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
      <div class="max-w-2xl mx-auto bg-slate-800/80 backdrop-blur-md border border-slate-700/60 rounded-2xl p-8 shadow-2xl">
        <h3 class="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <Settings class="w-6 h-6 text-blue-400 stroke-[1.5]" />
          <span>系統設定</span>
        </h3>
        
        <div class="space-y-6">
          <div>
            <label class="block text-sm font-normal text-slate-400 mb-2.5">資料儲存路徑</label>
            <div class="bg-slate-900/50 p-4 rounded-xl border border-slate-700 text-base text-slate-200 break-all font-mono mb-4 flex items-center gap-3">
              <FolderOpen class="w-6 h-6 text-amber-400/90 shrink-0" />
              <span>{{ currentDataPath || '讀取中...' }}</span>
            </div>
            <button 
              @click="changeDataPath"
              class="w-full py-3 bg-slate-700 hover:bg-slate-655 text-white border border-slate-600 rounded-xl font-normal text-base transition-colors shadow-lg"
            >
              更改資料夾 (設定共用路徑)
            </button>
            <p class="text-sm text-slate-400 mt-3 leading-relaxed">
              設定後請重啟應用程式。<br>
              若要與同事共用資料，請選擇網路磁碟機 (如 Z:\) 或雲端同步資料夾 (如 Dropbox)。
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
