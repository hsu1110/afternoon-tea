<script setup>
import { ref, provide, onMounted } from 'vue';
import ConfirmModal from './components/ConfirmModal.vue';
import TitleBar from './components/TitleBar.vue';

const toastMessage = ref('');
const showToast = ref(false);
const appVersion = ref('v1.0.0');

onMounted(async () => {
  try {
    const ver = await window.electronAPI.getAppVersion();
    appVersion.value = `v${ver}`;
  } catch (e) {
    console.error('Failed to get app version', e);
  }
});

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
  <div class="min-h-screen bg-slate-900 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white flex flex-col">
    
    <!-- Custom Title Bar -->
    <TitleBar class="fixed top-0 left-0 w-full z-50" />
    
    <!-- Background Effects -->
    <div class="fixed inset-0 z-0 pointer-events-none">
      <div class="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[120px] animate-pulse-slow"></div>
      <div class="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px] animate-pulse-slow" style="animation-delay: 2s;"></div>
    </div>

    <!-- Sidebar -->
    <aside class="fixed top-10 left-0 h-[calc(100%-2.5rem)] w-64 bg-slate-800/40 backdrop-blur-xl border-r border-white/5 flex flex-col z-40 transition-all duration-300">
      <div class="p-8">
        <h1 class="text-2xl font-bold flex items-center gap-3">
          <span class="text-3xl">🎡</span>
          <span class="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">下午茶</span>
        </h1>
        <p class="text-xs text-slate-500 mt-2 tracking-wider uppercase">Afternoon Tea</p>
      </div>

      <nav class="flex-1 px-4 space-y-2">
        <router-link 
          to="/" 
          class="flex items-center gap-4 px-4 py-3 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all group"
          active-class="bg-gradient-to-r from-blue-600/20 to-purple-600/20 text-white shadow-lg shadow-blue-900/20 border border-white/10"
        >
          <span class="text-xl group-hover:scale-110 transition-transform">🏠</span>
          <span class="font-medium">首頁</span>
        </router-link>
        
        <router-link 
          to="/order" 
          class="flex items-center gap-4 px-4 py-3 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all group"
          active-class="bg-gradient-to-r from-blue-600/20 to-purple-600/20 text-white shadow-lg shadow-blue-900/20 border border-white/10"
        >
          <span class="text-xl group-hover:scale-110 transition-transform">📝</span>
          <span class="font-medium">點餐</span>
        </router-link>
        
        <router-link 
          to="/history" 
          class="flex items-center gap-4 px-4 py-3 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all group"
          active-class="bg-gradient-to-r from-blue-600/20 to-purple-600/20 text-white shadow-lg shadow-blue-900/20 border border-white/10"
        >
          <span class="text-xl group-hover:scale-110 transition-transform">📜</span>
          <span class="font-medium">紀錄</span>
        </router-link>

        <router-link 
          to="/finance" 
          class="flex items-center gap-4 px-4 py-3 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all group"
          active-class="bg-gradient-to-r from-blue-600/20 to-purple-600/20 text-white shadow-lg shadow-blue-900/20 border border-white/10"
        >
          <span class="text-xl group-hover:scale-110 transition-transform">💰</span>
          <span class="font-medium">財務</span>
        </router-link>
        
        <router-link 
          to="/admin" 
          class="flex items-center gap-4 px-4 py-3 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all group"
          active-class="bg-gradient-to-r from-blue-600/20 to-purple-600/20 text-white shadow-lg shadow-blue-900/20 border border-white/10"
        >
          <span class="text-xl group-hover:scale-110 transition-transform">⚙️</span>
          <span class="font-medium">管理</span>
        </router-link>
      </nav>

      <div class="p-4">
        <div class="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-xl p-4 border border-white/5">
          <div class="text-xs text-slate-500 mb-1">目前版本</div>
          <div class="text-sm font-mono text-slate-300">{{ appVersion }}</div>
        </div>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="ml-64 mt-10 relative z-10 min-h-[calc(100vh-2.5rem)]">
      <div class="p-8 md:p-12 max-w-7xl mx-auto">
        <router-view v-slot="{ Component }">
          <transition name="fade-slide" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </div>
    </main>

    <!-- Global Toast Notification -->
    <transition name="fade">
      <div v-if="showToast" class="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white px-6 py-3 rounded-xl shadow-2xl border border-slate-600 flex items-center gap-3 z-50">
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

  </div>
</template>

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
.animate-pulse-slow {
  animation: pulse-slow 8s infinite ease-in-out;
}
</style>
