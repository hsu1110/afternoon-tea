<script setup>
import { computed } from 'vue';

const props = defineProps({
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
</script>

<template>
  <div class="bg-slate-800/80 backdrop-blur-md border border-slate-600 rounded-2xl p-6 shadow-xl">
    <h3 class="text-xl font-bold text-white mb-6 flex items-center gap-2">
      <span>{{ editingOrderId ? '✏️ 編輯訂單' : '📝 我要點餐' }}</span>
    </h3>
    
    <form @submit.prevent="emit('submit')" class="space-y-4">
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

      <div class="grid grid-cols-2 gap-4">
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

      <div>
        <label class="block text-sm font-medium text-slate-400 mb-1">備註 (甜度冰塊、餐點特製)</label>
        <input 
          v-model="localNote"
          type="text" 
          class="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
          placeholder="例如：微糖少冰、不要香菜"
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
