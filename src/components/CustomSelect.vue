<script setup>
import { ref, computed, watch, onUnmounted } from 'vue';
import { ChevronDown } from 'lucide-vue-next';

const props = defineProps({
  modelValue: {
    type: [Object, String, Number, Boolean],
    default: null
  },
  options: {
    type: Array,
    default: () => []
  },
  optionLabel: {
    type: String,
    default: 'label'
  },
  optionValue: {
    type: String,
    default: ''
  },
  groups: {
    type: Array,
    default: null
  },
  groupLabel: {
    type: String,
    default: 'label'
  },
  groupItems: {
    type: String,
    default: 'items'
  },
  placeholder: {
    type: String,
    default: '請選擇'
  },
  disabled: {
    type: Boolean,
    default: false
  },
  className: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['update:modelValue', 'change']);

const isOpen = ref(false);

const getOptionLabel = (option) => {
  if (!option) return '';
  if (typeof option === 'object') {
    return option[props.optionLabel] || '';
  }
  return option;
};

const getOptionValue = (option) => {
  if (!option) return null;
  if (props.optionValue && typeof option === 'object') {
    return option[props.optionValue];
  }
  return option;
};

const displayLabel = computed(() => {
  if (props.modelValue === null || props.modelValue === undefined || props.modelValue === '') {
    return props.placeholder;
  }
  
  // Search flat options
  if (props.options && props.options.length > 0) {
    const found = props.options.find(opt => {
      const val = getOptionValue(opt);
      const mVal = (typeof props.modelValue === 'object' && props.optionValue) 
        ? props.modelValue[props.optionValue] 
        : props.modelValue;
      // Object vs primitive comparison
      return (typeof val === 'object' && typeof mVal === 'object')
        ? JSON.stringify(val) === JSON.stringify(mVal)
        : val === mVal;
    });
    if (found) return getOptionLabel(found);
  }
  
  // Search grouped options
  if (props.groups && props.groups.length > 0) {
    for (const group of props.groups) {
      const items = group[props.groupItems] || [];
      const found = items.find(opt => {
        const val = getOptionValue(opt);
        const mVal = (typeof props.modelValue === 'object' && props.optionValue) 
          ? props.modelValue[props.optionValue] 
          : props.modelValue;
        return (typeof val === 'object' && typeof mVal === 'object')
          ? JSON.stringify(val) === JSON.stringify(mVal)
          : val === mVal;
      });
      if (found) return getOptionLabel(found);
    }
  }

  if (typeof props.modelValue === 'object' && props.optionLabel) {
    return props.modelValue[props.optionLabel] || props.placeholder;
  }

  return props.modelValue;
});

const selectRef = ref(null);
const dropUp = ref(false);

const updateDirection = () => {
  if (!selectRef.value) return;
  const rect = selectRef.value.getBoundingClientRect();
  const spaceBelow = window.innerHeight - rect.bottom;
  // If space below is less than 250px, and there is more space above, open upwards
  dropUp.value = spaceBelow < 250 && rect.top > spaceBelow;
};

const selectOption = (option) => {
  const value = option === null ? null : getOptionValue(option);
  const result = option === null ? null : (props.optionValue ? value : option);
  emit('update:modelValue', result);
  emit('change', result);
  isOpen.value = false;
};

const closeDropdown = () => {
  setTimeout(() => {
    isOpen.value = false;
  }, 200);
};

const modalId = ref(null);
watch(isOpen, (openState) => {
  if (openState) {
    updateDirection();
    if (window.registerModal) {
      modalId.value = window.registerModal(() => {
        isOpen.value = false;
      });
    }
  } else if (modalId.value) {
    if (window.unregisterModal) {
      window.unregisterModal(modalId.value);
    }
    modalId.value = null;
  }
});

onUnmounted(() => {
  if (modalId.value && window.unregisterModal) {
    window.unregisterModal(modalId.value);
  }
});
</script>

<template>
  <div ref="selectRef" class="relative w-full" :class="className">
    <button
      type="button"
      :disabled="disabled"
      @click="isOpen = !isOpen"
      @blur="closeDropdown"
      class="relative w-full bg-slate-900/50 border border-slate-700/60 rounded-xl pl-5 pr-10 py-3 text-white font-normal text-base shadow-sm flex justify-between items-center transition-all focus:outline-none focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-left"
      :class="isOpen ? 'border-blue-500 ring-2 ring-blue-500/10' : ''"
    >
      <span class="truncate pl-0.5" :class="(modelValue === null || modelValue === undefined || modelValue === '') && 'text-slate-400'">
        {{ displayLabel }}
      </span>
      <ChevronDown class="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 shrink-0 transition-transform duration-250" :class="isOpen ? 'rotate-180' : ''" />
    </button>
    
    <!-- Custom Dropdown list -->
    <div 
      v-if="isOpen"
      class="absolute left-0 right-0 bg-slate-800 border border-slate-700/80 rounded-xl shadow-xl max-h-80 overflow-y-auto z-30 py-1"
      :class="dropUp ? 'bottom-full mb-1.5' : 'mt-1.5'"
    >
      <div 
        @mousedown="selectOption(null)"
        class="px-4 py-2.5 text-slate-400 hover:bg-slate-700/60 cursor-pointer text-base font-normal transition-colors"
      >
        {{ placeholder }}
      </div>
      
      <!-- Grouped options -->
      <template v-if="groups && groups.length > 0">
        <div v-for="group in groups" :key="group[groupLabel]">
          <div class="px-4 py-1.5 text-xs font-normal text-slate-500 bg-slate-900/20 uppercase tracking-wider">
            {{ group[groupLabel] }}
          </div>
          <div 
            v-for="opt in group[groupItems]" 
            :key="getOptionValue(opt)" 
            @mousedown="selectOption(opt)"
            class="px-6 py-2 text-white hover:bg-slate-700/60 cursor-pointer text-base font-normal transition-colors"
          >
            {{ getOptionLabel(opt) }}
          </div>
        </div>
      </template>
      
      <!-- Flat options -->
      <template v-else>
        <div 
          v-for="opt in options" 
          :key="getOptionValue(opt)" 
          @mousedown="selectOption(opt)"
          class="px-4 py-2.5 text-white hover:bg-slate-700/60 cursor-pointer text-base font-normal transition-colors"
        >
          {{ getOptionLabel(opt) }}
        </div>
      </template>
    </div>
  </div>
</template>
