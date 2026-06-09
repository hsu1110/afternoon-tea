<script setup>
import { Minus, Square, X } from 'lucide-vue-next';

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
  <div class="h-10 bg-transparent flex justify-between items-center select-none draggable px-4 border-b border-white/[0.03]">
    <!-- 左側：標題與 Logo -->
    <div class="flex items-center gap-2">
      <img src="/icon.svg" alt="Icon" class="w-5 h-5 opacity-90">
      <span class="text-xs font-black text-slate-300 tracking-wider">來訂下午茶吧</span>
    </div>

    <!-- 右側：Win11 懸浮按鈕 -->
    <div class="flex items-center gap-1 no-drag">
      <button 
        @click="minimize" 
        class="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-white/5 hover:text-white transition-colors"
        title="最小化"
      >
        <Minus class="w-3.5 h-3.5" />
      </button>
      <button 
        @click="maximize" 
        class="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-white/5 hover:text-white transition-colors"
        title="最大化/還原"
      >
        <Square class="w-3 h-3" />
      </button>
      <button 
        @click="closeApp" 
        class="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-red-500/20 hover:text-red-400 transition-colors"
        title="關閉"
      >
        <X class="w-3.5 h-3.5" />
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
