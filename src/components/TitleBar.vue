<script setup>
const minimize = () => {
  window.electronAPI.minimize();
};

const maximize = () => {
  window.electronAPI.maximize();
};

const closeApp = () => {
  window.electronAPI.close();
};
</script>

<template>
  <div class="h-10 bg-slate-900 flex justify-between items-center select-none draggable border-b border-slate-800">
    <!-- Left: Title & Icon -->
    <div class="flex items-center px-3 gap-2">
      <img src="/icon.svg" alt="Icon" class="w-8 h-8 opacity-80">
      <span class="text-sm font-bold text-slate-400 tracking-wide">來訂下午茶吧</span>
    </div>

    <!-- Right: Window Controls -->
    <div class="flex h-full no-drag">
      <!-- Minimize -->
      <button 
        @click="minimize" 
        class="w-12 h-full flex items-center justify-center text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
        title="最小化"
      >
        <svg width="10" height="1" viewBox="0 0 10 1" fill="currentColor">
          <rect width="10" height="1"></rect>
        </svg>
      </button>

      <!-- Maximize -->
      <button 
        @click="maximize" 
        class="w-12 h-full flex items-center justify-center text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
        title="最大化/還原"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1">
          <rect x="1.5" y="1.5" width="7" height="7"></rect>
        </svg>
      </button>

      <!-- Close -->
      <button 
        @click="closeApp" 
        class="w-12 h-full flex items-center justify-center text-slate-400 hover:bg-red-500 hover:text-white transition-colors"
        title="關閉"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.2">
          <path d="M1 1L9 9M9 1L1 9"></path>
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.draggable {
  -webkit-app-region: drag;
}
.no-drag {
  -webkit-app-region: no-drag;
}
</style>
