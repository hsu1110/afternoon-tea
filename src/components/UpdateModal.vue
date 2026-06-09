<script setup>
import { computed, onUnmounted, watch } from 'vue';
import { CheckCircle2, ArrowDownToLine, RefreshCw, Rocket } from 'lucide-vue-next';

const props = defineProps({
  modelValue: Boolean,
  version: String,
  releaseNotes: String,
  installerPath: String,
  isLatest: Boolean,
  progress: {
    type: Number,
    default: 0
  },
  isDownloading: {
    type: Boolean,
    default: false
  }
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
  // Do not close modal immediately, wait for download
  // visible.value = false; 
};

const handleCancel = () => {
  visible.value = false;
};

let modalId = null;

const register = () => {
  if (visible.value && !modalId) {
    modalId = window.registerModal(() => {
      if (!props.isDownloading) {
        handleCancel();
      }
    });
  }
};

const unregister = () => {
  if (modalId) {
    window.unregisterModal(modalId);
    modalId = null;
  }
};

watch(() => visible.value, (newVal) => {
  if (newVal) {
    register();
  } else {
    unregister();
  }
}, { immediate: true });

onUnmounted(() => {
  unregister();
});

import { marked } from 'marked';

// ... (props definition)

// Format release notes (Markdown to HTML)
const formattedReleaseNotes = computed(() => {
  if (!props.releaseNotes) return '無詳細說明';
  try {
    return marked.parse(props.releaseNotes);
  } catch (e) {
    return props.releaseNotes;
  }
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
    <div class="relative overflow-hidden bg-slate-800/90 backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-2xl p-6 text-left group">
      
      <!-- Background Decoration (Toothless GIF) -->
      <img 
        src="/Toothless-dancing.gif" 
        class="absolute top-0 right-6 w-36 h-36 pointer-events-none transition-opacity object-contain opacity-80"
        alt="Update Animation"
      />

      <!-- Header -->
      <div class="relative z-10 mb-6 pr-32">
        <div class="flex items-center gap-2.5 mb-2">
          <div class="p-2 rounded-xl animate-pulse" :class="isLatest ? 'bg-blue-500/10 text-blue-400 border border-blue-500/25' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25'">
            <CheckCircle2 v-if="isLatest" class="w-5 h-5" />
            <ArrowDownToLine v-else class="w-5 h-5" />
          </div>
          <h2 class="text-xl font-bold text-white tracking-tight">{{ isLatest ? '目前是最新版本' : '發現新版本' }}</h2>
        </div>
        <div class="flex items-baseline gap-2">
          <span class="text-3xl font-black text-transparent bg-clip-text" :class="isLatest ? 'bg-gradient-to-r from-blue-400 to-indigo-300' : 'bg-gradient-to-r from-emerald-400 to-teal-400'">
            v{{ version }}
          </span>
          <span class="text-xs font-semibold text-slate-400">{{ isLatest ? '系統運作良好' : '建議立即安裝' }}</span>
        </div>
      </div>

      <!-- Release Notes -->
      <div class="relative z-10 mb-6">
        <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <span class="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
          <span>更新日誌</span>
        </label>
        <div 
          class="bg-slate-950/40 rounded-xl p-4 text-slate-350 text-sm leading-relaxed max-h-52 overflow-y-auto custom-scrollbar border border-slate-800/80 font-medium"
          v-html="formattedReleaseNotes"
        ></div>
      </div>

      <!-- Progress Bar -->
      <div v-if="isDownloading" class="relative z-10 mb-6 bg-slate-900/60 p-3 border border-slate-800/60 rounded-xl">
        <div class="flex justify-between text-xs text-slate-450 mb-1.5 font-semibold">
          <span class="flex items-center gap-1.5">
            <RefreshCw class="w-3.5 h-3.5 animate-spin text-blue-400" />
            <span>新版本下載中...</span>
          </span>
          <span class="font-mono">{{ progress }}%</span>
        </div>
        <div class="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700/30">
          <div class="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(59,130,246,0.3)]" :style="{ width: progress + '%' }"></div>
        </div>
      </div>

      <!-- Footer / Actions -->
      <div class="relative z-10 flex gap-3 pt-2">
        <button 
          v-if="!isLatest && !isDownloading"
          @click="handleCancel"
          class="flex-1 px-4 py-2.5 bg-slate-800/80 hover:bg-red-500/10 border border-slate-700/60 hover:border-red-500/30 text-slate-350 hover:text-red-300 rounded-xl font-normal transition-all shadow-md"
        >
          稍後再說
        </button>
        <button 
          @click="isLatest ? handleCancel() : handleConfirm()"
          :disabled="isDownloading"
          class="flex-1 px-4 py-2.5 rounded-xl font-normal shadow-lg transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed border"
          :class="isLatest ? 'bg-slate-800/80 hover:bg-slate-700 border-slate-700/60 text-white shadow-slate-900/50' : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 border-emerald-500/30 text-white shadow-emerald-500/10'"
        >
          <Rocket v-if="!isLatest && !isDownloading" class="w-4.5 h-4.5" />
          {{ isLatest ? '關閉' : (isDownloading ? '下載中...' : '立即安裝') }}
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
