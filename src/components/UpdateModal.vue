<script setup>
import { computed } from 'vue';

const props = defineProps({
  modelValue: Boolean,
  version: String,
  releaseNotes: String,
  installerPath: String,
  isLatest: Boolean
});

const emit = defineEmits(['update:modelValue', 'confirm']);

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
});

const handleConfirm = () => {
  if (props.isLatest) {
    visible.value = false;
    return;
  }
  emit('confirm', props.installerPath);
  visible.value = false;
};

const handleCancel = () => {
  visible.value = false;
};

// Format release notes (replace \n with <br>)
const formattedReleaseNotes = computed(() => {
  // Support \n, \r\n, and /n (user custom)
  return (props.releaseNotes || '無詳細說明').replace(/(\r\n|\n|\/n)/g, '<br/>');
});
</script>

<template>
  <el-dialog
    v-model="visible"
    :show-close="false"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    append-to-body
    width="480px"
    class="update-dialog-clean"
    align-center
  >
    <!-- Card Container -->
    <div class="relative overflow-hidden bg-slate-800/90 backdrop-blur-md border border-slate-600 rounded-2xl shadow-2xl p-6 text-left group">
      
      <!-- Background Decoration -->
      <img 
        src="/Toothless-dancing.gif" 
        class="absolute top-0 right-12 w-48 h-48 pointer-events-none transition-opacity object-contain"
        alt="Update Animation"
      />

      <!-- Header -->
      <div class="relative z-10 mb-6 pr-24">
        <div class="flex items-center gap-3 mb-2">
          <div class="p-2 rounded-lg" :class="isLatest ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'">
            <svg v-if="isLatest" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            <svg v-else width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
          </div>
          <h2 class="text-2xl font-bold text-white">{{ isLatest ? '目前是最新版本' : '發現新版本' }}</h2>
        </div>
        <div class="flex items-baseline gap-2">
          <span class="text-3xl font-black text-transparent bg-clip-text" :class="isLatest ? 'bg-gradient-to-r from-blue-400 to-indigo-400' : 'bg-gradient-to-r from-green-400 to-emerald-600'">
            v{{ version }}
          </span>
          <span class="text-sm text-slate-400">{{ isLatest ? '無需更新' : '已經準備好下載' }}</span>
        </div>
      </div>

      <!-- Release Notes -->
      <div class="relative z-10 mb-6">
        <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">更新內容</label>
        <div 
          class="bg-slate-900/50 rounded-xl p-4 text-slate-300 text-sm leading-relaxed max-h-60 overflow-y-auto custom-scrollbar border border-slate-700/50"
          v-html="formattedReleaseNotes"
        ></div>
      </div>

      <!-- Footer / Actions -->
      <div class="relative z-10 flex gap-3 pt-2">
        <button 
          v-if="!isLatest"
          @click="handleCancel"
          class="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl font-bold transition-colors"
        >
          稍後再說
        </button>
        <button 
          @click="isLatest ? handleCancel() : handleConfirm()"
          class="flex-1 px-4 py-3 rounded-xl font-bold shadow-lg transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
          :class="isLatest ? 'bg-slate-700 hover:bg-slate-600 text-white shadow-slate-500/25' : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white shadow-green-500/25'"
        >
          <span v-if="!isLatest">🚀</span>
          {{ isLatest ? '關閉' : '立即更新' }}
        </button>
      </div>

    </div>
  </el-dialog>
</template>

<style>
/* Reset Element Plus Dialog Styles for this specific modal */
.update-dialog-clean {
  background: transparent !important;
  box-shadow: none !important;
  border: none !important;
  padding: 0 !important;
}

.update-dialog-clean .el-dialog__header {
  display: none !important;
}

.update-dialog-clean .el-dialog__body {
  padding: 0 !important;
  background: transparent !important;
}

/* Scrollbar */
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(30, 41, 59, 0.5);
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(71, 85, 105, 0.8);
  border-radius: 3px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(100, 116, 139, 1);
}
</style>
