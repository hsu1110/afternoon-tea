<script setup>
import { ref, computed, watch, onUnmounted } from 'vue';
import { User, ShoppingBag, DollarSign, FileText, Keyboard, Coins, Pencil } from 'lucide-vue-next';
import CustomSelect from './CustomSelect.vue';

const props = defineProps({
  menuData: {
    type: Object,
    default: null
  },
  members: {
    type: Array,
    default: () => []
  },
  selectedMember: {
    type: Object,
    default: null
  },
  manualName: {
    type: String,
    default: ''
  },
  item: {
    type: String,
    default: ''
  },
  price: {
    type: [String, Number],
    default: ''
  },
  note: {
    type: String,
    default: ''
  },
  isSelfPay: {
    type: Boolean,
    default: false
  },
  isSubmitting: {
    type: Boolean,
    default: false
  },
  isLocked: {
    type: Boolean,
    default: false
  },
  editingOrderId: {
    type: [String, Number],
    default: null
  }
});

const emit = defineEmits([
  'update:selectedMember',
  'update:manualName',
  'update:item',
  'update:price',
  'update:note',
  'update:isSelfPay',
  'submit',
  'cancel',
  'quickFill'
]);

const localSelectedMember = computed({
  get: () => props.selectedMember,
  set: (val) => emit('update:selectedMember', val)
});

const localManualName = computed({
  get: () => props.manualName,
  set: (val) => emit('update:manualName', val)
});

const localItem = computed({
  get: () => props.item,
  set: (val) => emit('update:item', val)
});

const localPrice = computed({
  get: () => props.price,
  set: (val) => emit('update:price', val)
});

const localNote = computed({
  get: () => props.note,
  set: (val) => emit('update:note', val)
});

const localIsSelfPay = computed({
  get: () => props.isSelfPay,
  set: (val) => emit('update:isSelfPay', val)
});

const handleMemberChange = () => {
  emit('update:manualName', '');
  emit('quickFill');
};

const handleManualNameBlur = () => {
  emit('quickFill');
};

const selectedItemId = ref('');
const selectedSizeLabel = ref('');
const selectedCustomizations = ref({});
const manualUserNote = ref('');
const isManualMode = ref(true);

const hasAIMenu = computed(() => {
  if (!props.menuData) return false;
  return props.menuData.categories && props.menuData.categories.length > 0;
});

watch(hasAIMenu, (newVal) => {
  isManualMode.value = !newVal;
}, { immediate: true });

const currentMenuItem = computed(() => {
  if (!props.menuData || !props.menuData.categories) return null;
  
  for (const cat of props.menuData.categories) {
    if (cat.items) {
      const item = cat.items.find(i => i.item_id === selectedItemId.value);
      if (item) return item;
    }
  }
  
  return null;
});

const allCustomizationGroups = computed(() => {
  if (!currentMenuItem.value) return [];
  
  const globalCustoms = props.menuData?.global_customizations || [];
  const itemCustoms = currentMenuItem.value.item_specific_customizations || [];
  
  // Merge, letting itemCustoms override globalCustoms based on group_name
  const mergedMap = new Map();
  
  globalCustoms.forEach(g => mergedMap.set(g.group_name, g));
  itemCustoms.forEach(g => mergedMap.set(g.group_name, g));
  
  return Array.from(mergedMap.values());
});

watch(() => currentMenuItem.value?.item_id, (newId, oldId) => {
  if (newId && newId !== oldId && !props.editingOrderId) {
    const item = currentMenuItem.value;
    selectedSizeLabel.value = (item.sizes && item.sizes.length > 0) ? item.sizes[0].label : '';
    
    const initCustoms = {};
    allCustomizationGroups.value.forEach(g => {
      initCustoms[g.group_name] = g.max_selection === 1 ? '' : [];
    });
    selectedCustomizations.value = initCustoms;
  }
});

let isInternalNoteUpdate = false;

// 輔助函數：從完整備註字串中抽離出手動輸入的部分
const parseManualNoteFromStr = (noteStr) => {
  if (!noteStr) return '';
  
  // 優先尋找新的格式 "備註："
  const manualLabel = '備註：';
  const lastIndex = noteStr.lastIndexOf(manualLabel);
  if (lastIndex !== -1) {
    return noteStr.substring(lastIndex + manualLabel.length).trim();
  }
  
  // 相容舊格式 [...]
  const oldMatch = noteStr.match(/^\[(.*?)\]\s*(.*)$/);
  if (oldMatch) return oldMatch[2];
  
  // 如果包含全形冒號但沒有"備註："，說明這整串可能都是系統標籤，沒有手動備註
  if (noteStr.includes('：')) return '';
  
  // 完全沒標籤，則整串都是手動備註
  return noteStr;
};

watch([currentMenuItem, selectedSizeLabel, selectedCustomizations, manualUserNote], () => {
  if (!currentMenuItem.value || isManualMode.value) return;
  
  const item = currentMenuItem.value;
  let price = 0;
  
  const sizeObj = item.sizes?.find(s => s.label === selectedSizeLabel.value);
  let sizeText = '';
  if (sizeObj) {
    price += sizeObj.price || 0;
    if (sizeObj.label !== '一般' && sizeObj.label !== '單一尺寸' && sizeObj.label !== '常規') {
      sizeText = sizeObj.label;
    }
  }

  const noteParts = [];
  if (sizeText) noteParts.push(`規格：${sizeText}`);
  
  for (const groupName in selectedCustomizations.value) {
    const selectedOptions = selectedCustomizations.value[groupName];
    if (!selectedOptions || (Array.isArray(selectedOptions) && selectedOptions.length === 0)) continue;
    
    const group = allCustomizationGroups.value.find(g => g.group_name === groupName);
    if (!group) continue;

    const opts = Array.isArray(selectedOptions) ? selectedOptions : [selectedOptions];
    const freeCount = group.free_selection_count || 0;
    const extraPrice = group.extra_selection_price || 0;
    
    opts.forEach((optName) => {
      const optDef = group.options.find(o => o.name === optName);
      if (optDef) {
        price += optDef.price_adjustment || 0;
      }
    });

    if (opts.length > freeCount) {
      price += (opts.length - freeCount) * extraPrice;
    }

    noteParts.push(`${groupName}：${opts.join(', ')}`);
  }

  if (manualUserNote.value) noteParts.push(`備註：${manualUserNote.value}`);
  
  localItem.value = item.name;
  localPrice.value = price;
  
  isInternalNoteUpdate = true;
  localNote.value = noteParts.join('、');
  
  setTimeout(() => { isInternalNoteUpdate = false; }, 0);
}, { deep: true });

watch(() => props.editingOrderId, (newVal) => {
  if (newVal) {
    manualUserNote.value = parseManualNoteFromStr(localNote.value);

    if (props.menuData && props.menuData.categories) {
      let matchedItem = null;
      for (const cat of props.menuData.categories) {
        if (cat.items) {
          matchedItem = cat.items.find(i => i.name === localItem.value);
          if (matchedItem) break;
        }
      }
      if (matchedItem) {
        isManualMode.value = false;
        selectedItemId.value = matchedItem.item_id;
      } else {
        isManualMode.value = true;
      }
    }
  } else {
    selectedItemId.value = '';
    manualUserNote.value = '';
    if (hasAIMenu.value) {
      isManualMode.value = false;
    }
  }
});

watch(localNote, (newVal) => {
  if (isInternalNoteUpdate || !selectedItemId.value || isManualMode.value) return; 
  
  const extractedManual = parseManualNoteFromStr(newVal);
  if (manualUserNote.value !== extractedManual) {
    manualUserNote.value = extractedManual;
  }
});
const isOptionSelected = (group, optName) => {
  const val = selectedCustomizations.value[group.group_name];
  if (Array.isArray(val)) {
    return val.includes(optName);
  }
  return val === optName;
};

const toggleOption = (group, optName) => {
  const groupName = group.group_name;
  const current = selectedCustomizations.value[groupName];
  
  if (group.max_selection === 1) {
    // Single choice
    if (current === optName) {
      // Deselect if not required
      if (!group.is_required) {
        selectedCustomizations.value[groupName] = '';
      }
    } else {
      selectedCustomizations.value[groupName] = optName;
    }
  } else {
    // Multiple choice
    const idx = current.indexOf(optName);
    if (idx > -1) {
      current.splice(idx, 1);
    } else {
      if (!group.max_selection || current.length < group.max_selection) {
        current.push(optName);
      }
    }
  }
};
const getOptionPriceLabel = (group, opt) => {
  const itemSurcharge = opt.price_adjustment || 0;
  const extraPrice = group.extra_selection_price || 0;
  const freeCount = group.free_selection_count || 0;
  
  if (itemSurcharge <= 0 && extraPrice <= 0) return '';

  const selected = selectedCustomizations.value[group.group_name];
  const selectedList = Array.isArray(selected) ? selected : (selected ? [selected] : []);
  const isSelected = selectedList.includes(opt.name);
  
  // 計算邏輯：
  // 1. 如果有 itemSurcharge，它一定會被加 (顯示為基礎加價)
  // 2. 如果選取總數會超過/已超過 freeCount，則還要加上 extraPrice
  
  let displayPrice = itemSurcharge;
  
  if (isSelected) {
    // 判斷這一項是否屬於「超額」的部分
    const index = selectedList.indexOf(opt.name);
    if (index >= freeCount) {
      displayPrice += extraPrice;
    }
  } else {
    // 預測：如果點下去，是否會觸發超額費？
    if (selectedList.length >= freeCount) {
      displayPrice += extraPrice;
    }
  }

  return displayPrice > 0 ? `(+${displayPrice})` : '(+0)';
};
</script>

<template>
  <div class="bg-slate-800/80 backdrop-blur-md border border-slate-700/60 rounded-2xl p-6 shadow-xl">
    <h3 class="text-xl font-bold text-white mb-6 flex items-center gap-2 tracking-tight">
      <Pencil v-if="editingOrderId" class="w-5 h-5 text-blue-400 stroke-[1.5]" />
      <span>{{ editingOrderId ? '編輯訂單' : '我要點餐' }}</span>
    </h3>
    
    <form @submit.prevent="emit('submit')" class="space-y-4">
      <div>
        <label class="block text-sm font-normal text-slate-300 mb-2 flex items-center gap-1.5">
          <User class="w-4 h-4 text-blue-400" />
          <span>姓名</span>
        </label>
        <div class="space-y-2">
          <!-- Custom Dropdown for selecting member -->
          <CustomSelect
            v-model="localSelectedMember"
            :options="members"
            option-label="name"
            placeholder="-- 選擇成員 --"
            :disabled="!!editingOrderId"
            @change="handleMemberChange"
          />
          <input 
            v-if="!localSelectedMember"
            v-model="localManualName"
            @blur="handleManualNameBlur"
            type="text" 
            class="w-full bg-slate-900/50 border border-slate-700/60 rounded-xl px-3.5 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all font-normal text-base shadow-sm disabled:opacity-50 disabled:cursor-not-allowed" 
            placeholder="請輸入您的姓名 (手動輸入)"
            :disabled="!!editingOrderId"
          >
        </div>
      </div>

      <!-- Toggle AI / Manual Button -->
      <div v-if="hasAIMenu" class="flex justify-end -mt-1 pb-1 select-none">
        <button 
          type="button" 
          @click="isManualMode = !isManualMode"
          class="text-xs font-normal bg-slate-900/50 hover:bg-slate-700/60 border border-slate-700/60 text-slate-300 px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 shadow-sm hover:text-white"
        >
          <Keyboard v-if="!isManualMode" class="w-3.5 h-3.5 text-blue-400" />
          <ShoppingBag v-else class="w-3.5 h-3.5 text-emerald-400" />
          <span>{{ isManualMode ? '使用 AI 菜單點餐' : '切換為手動輸入' }}</span>
        </button>
      </div>

      <!-- Manual Mode -->
      <div v-if="isManualMode" class="grid grid-cols-2 gap-3.5">
        <div class="space-y-1.5">
          <label class="block text-sm font-normal text-slate-300 flex items-center gap-1.5">
            <ShoppingBag class="w-4 h-4 text-indigo-400" />
            <span>品項</span>
          </label>
          <input 
            v-model="localItem"
            type="text" 
            required
            class="w-full bg-slate-900/40 border border-slate-700/60 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all font-normal text-base shadow-sm" 
            placeholder="例如：珍珠奶茶"
          >
        </div>
        <div class="space-y-1.5">
          <label class="block text-sm font-normal text-slate-300 flex items-center gap-1.5">
            <DollarSign class="w-4 h-4 text-emerald-400" />
            <span>價格</span>
          </label>
          <input 
            v-model="localPrice"
            type="number" 
            required
            class="w-full bg-slate-900/40 border border-slate-700/60 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all font-normal text-base shadow-sm" 
            placeholder="50"
          >
        </div>
      </div>
      
      <!-- AI Menu Mode -->
      <div v-else class="space-y-4">
        <div class="space-y-1.5">
          <label class="block text-sm font-normal text-slate-300 flex items-center gap-1.5">
            <ShoppingBag class="w-4 h-4 text-indigo-400" />
            <span>選擇品項</span>
          </label>
          
          <!-- Custom Dropdown for selecting item -->
          <CustomSelect
            v-model="selectedItemId"
            :groups="props.menuData.categories"
            group-label="category_name"
            group-items="items"
            option-label="name"
            option-value="item_id"
            placeholder="-- 請選擇品項 --"
          />
        </div>

        <template v-if="currentMenuItem">
          <!-- Sizes -->
          <div v-if="currentMenuItem.sizes && currentMenuItem.sizes.length > 1" class="space-y-1.5">
            <label class="block text-sm font-normal text-slate-350">規格</label>
            <div class="flex flex-wrap gap-2">
              <label v-for="size in currentMenuItem.sizes" :key="size.label" class="cursor-pointer">
                <input type="radio" :value="size.label" v-model="selectedSizeLabel" class="peer sr-only">
                <div class="px-3.5 py-1.5 rounded-xl border border-slate-700/60 bg-slate-900/40 text-slate-300 peer-checked:bg-blue-500/10 peer-checked:border-blue-500/40 peer-checked:text-blue-300 text-sm font-normal shadow-sm transition-all">
                  {{ size.label }} <span v-if="size.price" class="text-xs opacity-75">(${{ size.price }})</span>
                </div>
              </label>
            </div>
          </div>

          <!-- Customizations -->
          <div v-for="group in allCustomizationGroups" :key="group.group_name" class="space-y-1.5">
            <label class="block text-sm font-normal text-slate-350">
              {{ group.group_name }} <span v-if="group.is_required" class="text-rose-400">*</span>
            </label>
            <div class="flex flex-wrap gap-1.5">
              <div 
                v-for="opt in group.options" 
                :key="opt.name" 
                @click="toggleOption(group, opt.name)"
                class="cursor-pointer px-3.5 py-1.5 rounded-xl border text-sm font-normal shadow-sm transition-all"
                :class="isOptionSelected(group, opt.name) 
                  ? 'bg-blue-500/10 border-blue-500/40 text-blue-300 shadow-[0_0_10px_rgba(59,130,246,0.08)]' 
                  : 'bg-slate-900/40 border-slate-750 text-slate-300 hover:border-slate-655'"
              >
                {{ opt.name }} <span class="opacity-70 text-xs ml-0.5">{{ getOptionPriceLabel(group, opt) }}</span>
              </div>
            </div>
          </div>
          
          <div class="flex justify-between items-center text-sm text-slate-300 pt-3 border-t border-slate-700/50">
            <span>金額小計：</span>
            <span class="text-2xl font-normal text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.15)] font-mono">${{ localPrice }}</span>
          </div>
        </template>
      </div>

      <div class="space-y-1.5">
        <label class="block text-sm font-normal text-slate-300 flex items-center gap-1.5">
          <FileText class="w-4 h-4 text-amber-400 fill-amber-500/10" />
          <span>{{ isManualMode ? '備註 (甜度冰塊、餐點特製)' : '附加備註 (選填)' }}</span>
        </label>
        <input 
          v-if="isManualMode"
          v-model="localNote"
          type="text" 
          class="w-full bg-slate-900/40 border border-slate-700/60 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all font-normal text-base shadow-sm" 
          placeholder="例如：微糖少冰、不要香菜"
        >
        <input 
          v-else
          v-model="manualUserNote"
          type="text" 
          class="w-full bg-slate-900/40 border border-slate-700/60 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all font-normal text-base shadow-sm" 
          placeholder="例如：不要香菜"
        >
      </div>

      <div class="flex items-center gap-2.5 pt-1.5 pb-0.5 select-none">
        <input 
          type="checkbox" 
          id="isSelfPay" 
          v-model="localIsSelfPay"
          class="w-5 h-5 rounded bg-slate-900/50 cursor-pointer transition-all focus:ring-amber-500 text-amber-500"
          :class="localIsSelfPay ? 'border-amber-500/50' : 'border-slate-650'"
        >
        <label 
          for="isSelfPay" 
          class="text-base select-none cursor-pointer transition-all flex items-center gap-2"
          :class="localIsSelfPay ? 'text-amber-300' : 'text-slate-300 hover:text-white font-normal'"
        >
          <Coins 
            class="w-4.5 h-4.5 transition-all" 
            :class="localIsSelfPay ? 'text-amber-400 drop-shadow-[0_0_6px_rgba(245,158,11,0.35)]' : 'text-slate-400'" 
          />
          <span>自費 (不計入公費)</span>
        </label>
      </div>

      <div class="flex gap-3 pt-2">
        <button 
          v-if="editingOrderId"
          type="button"
          @click="emit('cancel')"
          class="flex-1 py-3 bg-slate-800/80 hover:bg-slate-700 border border-slate-750 text-slate-350 hover:text-white rounded-xl transition-all shadow-md text-base font-normal"
        >
          取消
        </button>
        <button 
          type="submit"
          :disabled="isSubmitting || isLocked"
          class="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white rounded-xl shadow-lg shadow-emerald-500/15 transform hover:-translate-y-0.5 transition-all duration-250 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none text-base font-normal"
        >
          {{ isLocked ? '已截止' : (isSubmitting ? '處理中...' : (editingOrderId ? '更新訂單' : '送出訂單')) }}
        </button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.custom-select {
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.85rem center;
  background-size: 1.15rem;
}
</style>
