<script setup>
import { ref, computed } from 'vue';
import { Calendar, Pencil } from 'lucide-vue-next';

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  label: {
    type: String,
    default: '選擇時間'
  }
});

const emit = defineEmits(['update:modelValue']);

const inputRef = ref(null);

const displayDate = computed(() => {
  if (!props.modelValue) return '尚未設定';
  const date = new Date(props.modelValue);
  return date.toLocaleString([], { 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit', 
    hour: '2-digit', 
    minute: '2-digit' 
  });
});

const openPicker = () => {
  if (inputRef.value) {
    try {
      inputRef.value.showPicker();
    } catch (e) {
      // Fallback for older browsers
      inputRef.value.focus();
    }
  }
};

const handleInput = (e) => {
  emit('update:modelValue', e.target.value);
};
</script>

<template>
  <div class="relative group cursor-pointer" @click="openPicker">
    <!-- Custom Trigger -->
    <div class="bg-slate-800 border border-slate-700/60 rounded-xl px-4 py-3 flex items-center justify-between hover:border-blue-500 hover:bg-slate-700/50 transition-all shadow-sm group-hover:shadow-blue-500/10">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
          <Calendar class="w-4.5 h-4.5 stroke-[1.5]" />
        </div>
        <div class="flex flex-col items-start">
          <span class="text-xs text-slate-500 font-normal">{{ label }}</span>
          <span class="text-white font-mono font-normal">{{ displayDate }}</span>
        </div>
      </div>
      <div class="text-slate-500 group-hover:text-blue-400 transition-colors">
        <Pencil class="w-4 h-4 stroke-[1.5]" />
      </div>
    </div>

    <!-- Hidden Native Input -->
    <input 
      ref="inputRef"
      type="datetime-local" 
      :value="modelValue"
      @input="handleInput"
      class="absolute inset-0 opacity-0 cursor-pointer -z-10"
    >
  </div>
</template>
