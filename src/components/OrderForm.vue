<script setup>
import { ref, computed, watch } from 'vue';

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

watch(() => props.menuData, () => {
  isManualMode.value = !hasAIMenu.value;
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
  <div class="bg-slate-800/80 backdrop-blur-md border border-slate-600 rounded-2xl p-6 shadow-xl">
    <h3 class="text-xl font-bold text-white mb-6 flex items-center gap-2">
      <span>{{ editingOrderId ? '✏️ 編輯訂單' : '📝 我要點餐' }}</span>
    </h3>
    
    <form @submit.prevent="emit('submit')" class="space-y-3">
      <div>
        <label class="block text-sm font-medium text-slate-400 mb-1">姓名</label>
        <div class="flex flex-wrap gap-2">
          <select 
            v-model="localSelectedMember"
            @change="handleMemberChange"
            class="flex-1 min-w-[130px] bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="!!editingOrderId"
          >
            <option :value="null">-- 選擇成員 --</option>
            <option v-for="member in members" :key="member.id" :value="member">
              {{ member.name }}
            </option>
          </select>
          <input 
            v-if="!localSelectedMember"
            v-model="localManualName"
            @blur="handleManualNameBlur"
            type="text" 
            class="flex-1 min-w-[130px] bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed" 
            placeholder="手動輸入姓名"
            :disabled="!!editingOrderId"
          >
        </div>
      </div>

      <!-- Toggle AI / Manual -->
      <div v-if="hasAIMenu" class="flex justify-end -mt-2">
        <button 
          type="button" 
          @click="isManualMode = !isManualMode"
          class="text-xs text-blue-400 hover:text-blue-300 underline"
        >
          {{ isManualMode ? '💡 使用 AI 菜單點餐' : '✍️ 切換為手動輸入' }}
        </button>
      </div>

      <!-- Manual Mode -->
      <div v-if="isManualMode" class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-slate-400 mb-1">品項</label>
          <input 
            v-model="localItem"
            type="text" 
            required
            class="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
            placeholder="例如：珍珠奶茶"
          >
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-400 mb-1">價格</label>
          <input 
            v-model="localPrice"
            type="number" 
            required
            class="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
            placeholder="50"
          >
        </div>
      </div>
      
      <!-- AI Menu Mode -->
      <div v-else class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-slate-400 mb-1">選擇品項</label>
          <select 
            v-model="selectedItemId"
            required
            class="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">-- 請選擇品項 --</option>
            <optgroup v-for="category in props.menuData.categories" :key="category.category_name" :label="category.category_name">
              <option v-for="item in category.items" :key="item.item_id" :value="item.item_id">
                {{ item.name }}
              </option>
            </optgroup>
          </select>
        </div>

        <template v-if="currentMenuItem">
          <!-- Sizes -->
          <div v-if="currentMenuItem.sizes && currentMenuItem.sizes.length > 1">
            <label class="block text-sm font-medium text-slate-400 mb-1">規格</label>
            <div class="flex flex-wrap gap-2">
              <label v-for="size in currentMenuItem.sizes" :key="size.label" class="cursor-pointer">
                <input type="radio" :value="size.label" v-model="selectedSizeLabel" class="peer sr-only">
                <div class="px-3 py-1.5 rounded-lg border border-slate-600 bg-slate-900/50 text-slate-300 peer-checked:bg-blue-600/20 peer-checked:border-blue-500 peer-checked:text-blue-400 text-sm transition-all">
                  {{ size.label }} <span v-if="size.price">(${{ size.price }})</span>
                </div>
              </label>
            </div>
          </div>

          <!-- Customizations -->
          <div v-for="group in allCustomizationGroups" :key="group.group_name">
            <label class="block text-sm font-medium text-slate-400 mb-1">
              {{ group.group_name }} <span v-if="group.is_required" class="text-rose-400">*</span>
            </label>
            <div class="flex flex-wrap gap-2">
              <div 
                v-for="opt in group.options" 
                :key="opt.name" 
                @click="toggleOption(group, opt.name)"
                class="cursor-pointer px-3 py-1.5 rounded-lg border text-sm transition-all"
                :class="isOptionSelected(group, opt.name) 
                  ? 'bg-blue-600/20 border-blue-500 text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.1)]' 
                  : 'bg-slate-900/50 border-slate-600 text-slate-300 hover:border-slate-500'"
              >
                {{ opt.name }} <span class="opacity-70 text-xs ml-0.5">{{ getOptionPriceLabel(group, opt) }}</span>
              </div>
            </div>
          </div>
          
          <div class="flex justify-between items-center text-sm text-slate-400 pt-2 border-t border-slate-700">
            <span>金額小計：</span>
            <span class="text-xl font-bold text-green-400">${{ localPrice }}</span>
          </div>
        </template>
      </div>

      <div>
        <label class="block text-sm font-medium text-slate-400 mb-1">
          {{ isManualMode ? '備註 (甜度冰塊、餐點特製)' : '附加備註 (選填)' }}
        </label>
        <input 
          v-if="isManualMode"
          v-model="localNote"
          type="text" 
          class="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
          placeholder="例如：微糖少冰、不要香菜"
        >
        <input 
          v-else
          v-model="manualUserNote"
          type="text" 
          class="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
          placeholder="例如：不要香菜"
        >
      </div>

      <div class="flex items-center gap-2">
        <input 
          type="checkbox" 
          id="isSelfPay" 
          v-model="localIsSelfPay"
          class="w-5 h-5 rounded border-slate-600 text-blue-600 focus:ring-blue-500 bg-slate-900/50"
        >
        <label for="isSelfPay" class="text-slate-300 select-none cursor-pointer">
          💰 自費 (不計入公費)
        </label>
      </div>

      <div class="flex gap-3">
        <button 
          v-if="editingOrderId"
          type="button"
          @click="emit('cancel')"
          class="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold transition-colors"
        >
          取消
        </button>
        <button 
          type="submit"
          :disabled="isSubmitting || isLocked"
          class="flex-1 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded-xl font-bold shadow-lg shadow-green-500/20 transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          {{ isLocked ? '已截止' : (isSubmitting ? '處理中...' : (editingOrderId ? '更新訂單' : '送出訂單')) }}
        </button>
      </div>
    </form>
  </div>
</template>
