<script setup>
import { ref, provide, onMounted, onUnmounted } from 'vue';
import { Home, Coffee, History, CircleDollarSign, Settings, RefreshCw, Cookie } from 'lucide-vue-next';
import ConfirmModal from './components/ConfirmModal.vue';
import TitleBar from './components/TitleBar.vue';
import UpdateModal from './components/UpdateModal.vue';
import { ElMessageBox } from 'element-plus';

const toastMessage = ref('');
const showToast = ref(false);
const appVersion = ref('v1.0.0');

// Update Logic State
const showUpdateModal = ref(false);
const updateInfo = ref({
  version: '',
  releaseNotes: '',
  installerPath: ''
});
const downloadProgress = ref(0);
const isDownloading = ref(false);

// Global Modal Stack & ESC key management
window.__activeModals = window.__activeModals || [];
window.registerModal = (closeFn) => {
  const id = Symbol('modal');
  window.__activeModals.push({ id, close: closeFn });
  return id;
};
window.unregisterModal = (id) => {
  window.__activeModals = window.__activeModals.filter(m => m.id !== id);
};

const handleEscKey = (e) => {
  if (e.key === 'Escape') {
    // 1. Input focus check: if focused on input/textarea, blur it first
    const activeEl = document.activeElement;
    if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
      activeEl.blur();
      return;
    }

    // 2. Modal stack check: close topmost modal
    if (window.__activeModals && window.__activeModals.length > 0) {
      const topmost = window.__activeModals[window.__activeModals.length - 1];
      topmost.close();
      return;
    }

    // 3. No modals: close/hide main app window
    window.electronAPI.close();
  }
};

onMounted(async () => {
  try {
    const ver = await window.electronAPI.getAppVersion();
    appVersion.value = `v${ver}`;
    
    // Listen for update progress
    if (window.electronAPI.onUpdateProgress) {
      window.electronAPI.onUpdateProgress((progressObj) => {
        isDownloading.value = true;
        downloadProgress.value = Math.round(progressObj.percent);
      });
    }
    
    // Auto check for update on startup
    checkUpdate(true);
  } catch (e) {
    console.error('Failed to get app version', e);
  }

  window.addEventListener('keydown', handleEscKey);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleEscKey);
});

const checkUpdate = async (isAutoCheck = false) => {
  try {
    const result = await window.electronAPI.checkForUpdate();
    console.log('Update Check Result:', result);

    if (result.hasUpdate) {
      updateInfo.value = {
        version: result.remoteVersion,
        releaseNotes: result.releaseNotes,
        installerPath: result.installerPath,
        isLatest: false
      };
      showUpdateModal.value = true;
    } else {
      if (!isAutoCheck) {
        // Manual check: Show modal even if latest
        updateInfo.value = {
          version: appVersion.value.replace('v', ''), // Use current version
          releaseNotes: '目前已是最新版本，無需更新。',
          installerPath: '',
          isLatest: true
        };
        showUpdateModal.value = true;
      }
    }
  } catch (error) {
    console.error(error);
    console.log('自動檢查更新失敗');
  }
};

const handleUpdateConfirm = async (installerPath) => {
  try {
    await window.electronAPI.performUpdate(installerPath);
  } catch (error) {
    console.error('Update execution failed:', error);
    ElMessageBox.alert('執行更新失敗，請稍後再試', '錯誤', { type: 'error', customClass: 'dark-mode-dialog' });
  }
};

const triggerToast = (msg) => {
  toastMessage.value = msg;
  showToast.value = true;
  setTimeout(() => {
    showToast.value = false;
  }, 3000);
};

provide('triggerToast', triggerToast);

// Confirm Modal Logic
const confirmState = ref({
  show: false,
  title: '',
  message: '',
  confirmText: '確定',
  cancelText: '取消',
  type: 'warning',
  resolve: null
});

const triggerConfirm = (options) => {
  return new Promise((resolve) => {
    confirmState.value = {
      show: true,
      title: options.title || '確認',
      message: options.message,
      confirmText: options.confirmText || '確定',
      cancelText: options.cancelText || '取消',
      type: options.type || 'warning',
      resolve
    };
  });
};

const handleConfirm = () => {
  if (confirmState.value.resolve) confirmState.value.resolve(true);
  confirmState.value.show = false;
};

const handleCancel = () => {
  if (confirmState.value.resolve) confirmState.value.resolve(false);
  confirmState.value.show = false;
};

provide('triggerConfirm', triggerConfirm);
</script>

<template>
  <div class="app-container">
    
    <!-- Custom Title Bar -->
    <TitleBar ref="titleBarRef" class="fixed top-0 left-0 w-full z-50" />
    
    <!-- Background Effects -->
    <div class="bg-effect-container">
      <div class="bg-effect bg-effect-purple"></div>
      <div class="bg-effect bg-effect-blue" style="animation-delay: 2s;"></div>
    </div>

    <!-- Sidebar -->
    <aside class="sidebar">
      <div class="sidebar-header flex items-center gap-3">
        <Coffee class="w-8 h-8 text-indigo-400 fill-indigo-500/10" />
        <span class="logo-text text-2xl font-black tracking-wider">TEA TIME</span>
      </div>

      <nav class="sidebar-nav">
        <router-link 
          to="/" 
          class="nav-link group"
          active-class="nav-link-active"
        >
          <Home class="nav-icon text-blue-400 fill-blue-500/10 group-hover:scale-110" />
          <span class="font-medium">首頁</span>
        </router-link>
        
        <router-link 
          to="/order" 
          class="nav-link group"
          active-class="nav-link-active"
        >
          <Cookie class="nav-icon text-emerald-400 fill-emerald-500/10 group-hover:scale-110" />
          <span class="font-medium">點餐</span>
        </router-link>
        
        <router-link 
          to="/history" 
          class="nav-link group"
          active-class="nav-link-active"
        >
          <History class="nav-icon text-violet-400 fill-violet-500/10 group-hover:scale-110" />
          <span class="font-medium">紀錄</span>
        </router-link>

        <router-link 
          to="/finance" 
          class="nav-link group"
          active-class="nav-link-active"
        >
          <CircleDollarSign class="nav-icon text-amber-400 fill-amber-500/10 group-hover:scale-110" />
          <span class="font-medium">財務</span>
        </router-link>
        
        <router-link 
          to="/admin" 
          class="nav-link group"
          active-class="nav-link-active"
        >
          <Settings class="nav-icon text-rose-400 fill-rose-500/10 group-hover:scale-110" />
          <span class="font-medium">管理</span>
        </router-link>
      </nav>

      <div class="p-4">
        <div class="version-card">
          <div class="flex justify-between items-center text-xs mb-3">
            <span class="text-slate-400 font-medium">系統版本</span>
            <span class="text-indigo-300 font-mono font-bold bg-indigo-500/15 px-2.5 py-0.5 rounded-full border border-indigo-500/20">{{ appVersion }}</span>
          </div>
          <button 
            @click="() => checkUpdate(false)"
            class="update-btn group w-full justify-center"
            title="檢查更新"
          >
            <RefreshCw class="w-3.5 h-3.5 text-indigo-400 group-hover:text-white transition-transform duration-700 group-hover:rotate-180" />
            <span>檢查更新</span>
          </button>
        </div>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="main-content">
      <div class="content-wrapper">
        <router-view v-slot="{ Component }">
          <transition name="fade-slide" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </div>
    </main>

    <!-- Global Toast Notification -->
    <transition name="fade">
      <div v-if="showToast" class="toast-notification">
        <span class="text-xl">🔔</span>
        <span class="font-medium">{{ toastMessage }}</span>
      </div>
    </transition>

    <!-- Global Confirm Modal -->
    <transition name="fade">
      <ConfirmModal 
        v-if="confirmState.show"
        :title="confirmState.title"
        :message="confirmState.message"
        :confirm-text="confirmState.confirmText"
        :cancel-text="confirmState.cancelText"
        :type="confirmState.type"
        @confirm="handleConfirm"
        @cancel="handleCancel"
      />
    </transition>

    <!-- Update Modal -->
    <UpdateModal
      v-model="showUpdateModal"
      :version="updateInfo.version"
      :release-notes="updateInfo.releaseNotes"
      :installer-path="updateInfo.installerPath"
      :is-latest="updateInfo.isLatest"
      :progress="downloadProgress"
      :is-downloading="isDownloading"
      @confirm="handleUpdateConfirm"
    />

  </div>
</template>

<style scoped>
.app-container {
  @apply h-screen overflow-hidden bg-slate-900 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white flex flex-col;
}

/* Background Effects */
.bg-effect-container {
  @apply fixed inset-0 z-0 pointer-events-none;
}
.bg-effect {
  @apply absolute w-[40%] h-[40%] rounded-full blur-[120px];
  animation: pulse-slow 8s infinite ease-in-out;
}
.bg-effect-purple {
  @apply top-[-10%] left-[-10%] bg-purple-600/20;
}
.bg-effect-blue {
  @apply bottom-[-10%] right-[-10%] bg-blue-600/20;
}

/* Sidebar */
.sidebar {
  @apply fixed top-10 left-0 h-[calc(100%-2.5rem)] w-64 bg-slate-800/40 backdrop-blur-xl border-r border-white/5 flex flex-col z-40 transition-all duration-300;
}
.sidebar-header {
  @apply p-8;
}
.logo-title {
  @apply text-2xl font-bold flex items-center gap-3;
}
.logo-text {
  @apply bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400;
}
.logo-subtitle {
  @apply text-xs text-slate-500 mt-2 tracking-wider uppercase;
}
.sidebar-nav {
  @apply flex-1 px-4 space-y-2;
}
.nav-link {
  @apply flex items-center gap-4 px-4 py-3 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all;
}
.nav-link-active {
  @apply bg-gradient-to-r from-blue-600/20 to-purple-600/20 text-white shadow-lg shadow-blue-900/20 border border-white/10;
}
.nav-icon {
  @apply w-5 h-5 transition-transform;
}
.nav-link-active .nav-icon {
  filter: drop-shadow(0 0 6px currentColor);
}
@keyframes spin-slow {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
.animate-spin-slow {
  animation: spin-slow 15s linear infinite;
}
.version-card {
  @apply bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-xl p-4 border border-white/5;
}
.update-btn {
  @apply text-xs bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white px-2.5 py-1.5 rounded-lg border border-indigo-500/20 hover:border-indigo-500/40 transition-all flex items-center gap-1.5 font-bold;
}

/* Main Content */
.main-content {
  @apply ml-64 mt-10 relative z-10 h-[calc(100vh-2.5rem)] overflow-y-auto;
}
.content-wrapper {
  @apply p-8 md:p-12 max-w-7xl mx-auto;
}

/* Toast */
.toast-notification {
  @apply fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white px-6 py-3 rounded-xl shadow-2xl border border-slate-600 flex items-center gap-3 z-50;
}
</style>

<style>
/* Global Scrollbar */
.custom-scrollbar::-webkit-scrollbar {
  width: 8px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.2);
}

/* Transitions */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(20px);
  filter: blur(8px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-20px);
  filter: blur(8px);
}

/* Toast Fade */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translate(-50%, 20px);
}

@keyframes pulse-slow {
  0%, 100% { opacity: 0.5; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(1.1); }
}
</style>
