<script setup>
import { onUnmounted, watch } from 'vue';

const props = defineProps({
  isOpen: {
    type: Boolean,
    required: true
  },
  maxWidth: {
    type: String,
    default: 'max-w-md'
  },
  customClass: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['close']);

let modalId = null;

const register = () => {
  if (props.isOpen && !modalId) {
    modalId = window.registerModal(() => emit('close'));
  }
};

const unregister = () => {
  if (modalId) {
    window.unregisterModal(modalId);
    modalId = null;
  }
};

watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    register();
  } else {
    unregister();
  }
}, { immediate: true });

onUnmounted(() => {
  unregister();
});
</script>

<template>
  <Teleport to="body">
    <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" @click="$emit('close')"></div>
      
      <!-- Modal Content -->
      <div 
        class="relative bg-slate-800 border border-slate-700 rounded-3xl shadow-2xl w-full transform transition-all scale-100 opacity-100"
        :class="[maxWidth, customClass]"
      >
        <slot></slot>
      </div>
    </div>
  </Teleport>
</template>
