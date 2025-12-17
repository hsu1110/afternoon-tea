<script setup>
import { ref } from 'vue';

const props = defineProps({
  title: {
    type: String,
    default: '確認'
  },
  message: {
    type: String,
    required: true
  },
  confirmText: {
    type: String,
    default: '確定'
  },
  cancelText: {
    type: String,
    default: '取消'
  },
  type: {
    type: String,
    default: 'warning', // warning, info, danger
    validator: (value) => ['warning', 'info', 'danger'].includes(value)
  }
});

const emit = defineEmits(['confirm', 'cancel']);

const handleConfirm = () => {
  emit('confirm');
};

const handleCancel = () => {
  emit('cancel');
};
</script>

<template>
  <div class="fixed inset-0 z-[100] flex items-center justify-center p-4">
    <!-- Backdrop -->
    <div class="absolute inset-0 bg-slate-900/80 backdrop-blur-sm transition-opacity" @click="handleCancel"></div>

    <!-- Modal -->
    <div class="relative bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100 opacity-100">
      
      <!-- Header -->
      <div class="p-6 pb-0 flex items-center gap-3">
        <div class="w-10 h-10 rounded-full flex items-center justify-center text-xl"
          :class="{
            'bg-amber-500/20 text-amber-500': type === 'warning',
            'bg-blue-500/20 text-blue-500': type === 'info',
            'bg-red-500/20 text-red-500': type === 'danger'
          }"
        >
          <span v-if="type === 'warning'">⚠️</span>
          <span v-else-if="type === 'info'">ℹ️</span>
          <span v-else>🗑️</span>
        </div>
        <h3 class="text-xl font-bold text-white">{{ title }}</h3>
      </div>

      <!-- Body -->
      <div class="p-6 text-slate-300">
        {{ message }}
      </div>

      <!-- Footer -->
      <div class="p-6 pt-0 flex justify-end gap-3">
        <button 
          @click="handleCancel"
          class="px-4 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
        >
          {{ cancelText }}
        </button>
        <button 
          @click="handleConfirm"
          class="px-4 py-2 rounded-lg font-bold text-white shadow-lg transition-all transform hover:-translate-y-0.5"
          :class="{
            'bg-amber-600 hover:bg-amber-500 shadow-amber-500/20': type === 'warning',
            'bg-blue-600 hover:bg-blue-500 shadow-blue-500/20': type === 'info',
            'bg-red-600 hover:bg-red-500 shadow-red-500/20': type === 'danger'
          }"
        >
          {{ confirmText }}
        </button>
      </div>

    </div>
  </div>
</template>
