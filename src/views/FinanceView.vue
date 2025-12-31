<script setup>
import { ref, onMounted, computed, inject } from 'vue';
import BaseModal from '../components/BaseModal.vue';

const funds = ref([]);
const triggerToast = inject('triggerToast');
const balance = computed(() => {
  return funds.value.reduce((acc, curr) => {
    return curr.type === 'income' ? acc + curr.amount : acc - curr.amount;
  }, 0);
});

const transactionForm = ref({
  type: 'income', // income | expense
  amount: '',
  note: ''
});

const showEditModal = ref(false);
const editForm = ref({
  id: '',
  type: 'income',
  amount: 0,
  note: '',
  date: ''
});

const loadFunds = async () => {
  try {
    const data = await window.electronAPI.getFunds();
    funds.value = data || [];
  } catch (error) {
    console.error('Failed to load funds:', error);
  }
};

const submitTransaction = async () => {
  try {
    await window.electronAPI.addFundTransaction({
      type: transactionForm.value.type,
      amount: parseInt(transactionForm.value.amount),
      note: transactionForm.value.note,
      date: new Date().toISOString().split('T')[0]
    });
    
    // Reset form
    transactionForm.value = { type: 'income', amount: '', note: '' };
    await loadFunds();
    triggerToast('新增成功');
  } catch (error) {
    console.error('Failed to add transaction:', error);
    triggerToast('新增失敗');
  }
};

const openEditModal = (record) => {
  editForm.value = {
    id: record.id,
    type: record.type,
    amount: record.amount,
    note: record.note,
    date: record.date.split('T')[0] // 只取日期部分
  };
  showEditModal.value = true;
};

const saveEdit = async () => {
  try {
    await window.electronAPI.updateFundTransaction({
      ...editForm.value,
      amount: Number(editForm.value.amount)
    });
    showEditModal.value = false;
    await loadFunds();
    triggerToast('更新成功');
  } catch (error) {
    console.error('Update failed:', error);
    triggerToast('更新失敗');
  }
};

const deleteTransaction = async (id) => {
  try {
    await window.electronAPI.deleteFundTransaction(id);
    await loadFunds();
    triggerToast('刪除成功');
  } catch (error) {
    console.error('Delete failed:', error);
    triggerToast('刪除失敗');
  }
};

onMounted(() => {
  loadFunds();
});
</script>

<template>
  <div class="w-full max-w-4xl mx-auto">
    <!-- Balance Card -->
    <div class="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-8 shadow-2xl mb-8 text-white relative overflow-hidden">
      <div class="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
      <div class="relative z-10">
        <h2 class="text-lg font-medium opacity-80 mb-2">公費總餘額</h2>
        <div class="text-5xl font-bold font-mono tracking-tight">${{ balance.toLocaleString() }}</div>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
      <!-- Transaction Form -->
      <div class="md:col-span-1 bg-slate-800/50 backdrop-blur-md border border-slate-700 rounded-2xl p-6 shadow-xl h-fit">
        <h3 class="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <span>💰</span> 記帳
        </h3>
        <form @submit.prevent="submitTransaction" class="space-y-4">
          <div class="flex bg-slate-900/50 p-1 rounded-lg border border-slate-600">
            <button 
              type="button"
              @click="transactionForm.type = 'income'"
              class="flex-1 py-2 rounded-md text-sm font-bold transition-all"
              :class="transactionForm.type === 'income' ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'"
            >
              收入 (儲值)
            </button>
            <button 
              type="button"
              @click="transactionForm.type = 'expense'"
              class="flex-1 py-2 rounded-md text-sm font-bold transition-all"
              :class="transactionForm.type === 'expense' ? 'bg-rose-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'"
            >
              支出 (買單)
            </button>
          </div>

          <div>
            <label class="block text-sm font-medium text-slate-400 mb-1">金額</label>
            <div class="relative">
              <span class="absolute left-3 top-2.5 text-slate-500">$</span>
              <input 
                v-model="transactionForm.amount"
                type="number" 
                required
                class="w-full bg-slate-900/50 border border-slate-600 rounded-lg pl-7 pr-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
                placeholder="0"
              >
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-slate-400 mb-1">備註</label>
            <input 
              v-model="transactionForm.note"
              type="text" 
              required
              class="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
              placeholder="例如：George 儲值、買 50 嵐"
            >
          </div>

          <button 
            type="submit"
            class="w-full py-3 rounded-xl font-bold shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 mt-2 text-white"
            :class="transactionForm.type === 'income' ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20' : 'bg-rose-600 hover:bg-rose-500 shadow-rose-500/20'"
          >
            {{ transactionForm.type === 'income' ? '➕ 新增收入' : '➖ 新增支出' }}
          </button>
        </form>
      </div>

      <!-- Transaction History -->
      <div class="md:col-span-2 bg-slate-800/50 backdrop-blur-md border border-slate-700 rounded-2xl p-6 shadow-xl">
        <h3 class="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <span>📜</span> 交易紀錄
        </h3>
        
        <div class="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
          <div v-if="funds.length === 0" class="text-center text-slate-500 py-8">
            目前沒有交易紀錄
          </div>
          <div 
            v-for="(record, index) in funds.slice().reverse()" 
            :key="record.id" 
            class="flex justify-between items-center p-4 rounded-xl border border-slate-700/50 hover:bg-slate-700/30 transition-colors group"
            :class="record.type === 'income' ? 'bg-emerald-900/10' : 'bg-rose-900/10'"
          >
            <div class="flex items-center gap-4">
              <div 
                class="w-10 h-10 rounded-full flex items-center justify-center text-lg"
                :class="record.type === 'income' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'"
              >
                {{ record.type === 'income' ? '📥' : '📤' }}
              </div>
              <div>
                <div class="font-bold text-slate-200">{{ record.note }}</div>
                <div class="text-xs text-slate-500">{{ new Date(record.date).toLocaleDateString() }}</div>
              </div>
            </div>
            
            <div class="flex items-center gap-4">
              <div 
                class="font-mono font-bold text-lg"
                :class="record.type === 'income' ? 'text-emerald-400' : 'text-rose-400'"
              >
                {{ record.type === 'income' ? '+' : '-' }}${{ record.amount }}
              </div>
              
              <!-- Action Buttons (Visible on Hover) -->
              <div class="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  @click="openEditModal(record)"
                  class="p-1.5 rounded-lg bg-slate-700 text-blue-400 hover:bg-blue-600 hover:text-white transition-colors"
                  title="編輯"
                >
                  ✏️
                </button>
                <el-popconfirm
                  title="確定要刪除這筆紀錄嗎？"
                  confirm-button-text="刪除"
                  cancel-button-text="取消"
                  confirm-button-type="danger"
                  @confirm="deleteTransaction(record.id)"
                >
                  <template #reference>
                    <button 
                      class="p-1.5 rounded-lg bg-slate-700 text-rose-400 hover:bg-rose-600 hover:text-white transition-colors"
                      title="刪除"
                    >
                      🗑️
                    </button>
                  </template>
                </el-popconfirm>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Edit Modal -->
    <!-- Edit Modal -->
    <BaseModal 
      :is-open="showEditModal" 
      max-width="max-w-md" 
      custom-class="p-6" 
      @close="showEditModal = false"
    >
      <h3 class="text-xl font-bold text-white mb-6 text-center">編輯交易紀錄</h3>
      
      <form @submit.prevent="saveEdit" class="space-y-4">
        <!-- Type Selection -->
        <div class="flex bg-slate-900/50 p-1 rounded-lg border border-slate-600">
          <button 
            type="button"
            @click="editForm.type = 'income'"
            class="flex-1 py-2 rounded-md text-sm font-bold transition-all"
            :class="editForm.type === 'income' ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'"
          >
            收入
          </button>
          <button 
            type="button"
            @click="editForm.type = 'expense'"
            class="flex-1 py-2 rounded-md text-sm font-bold transition-all"
            :class="editForm.type === 'expense' ? 'bg-rose-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'"
          >
            支出
          </button>
        </div>

        <!-- Amount -->
        <div>
          <label class="block text-sm font-medium text-slate-400 mb-1">金額</label>
          <div class="relative">
            <span class="absolute left-3 top-2.5 text-slate-500">$</span>
            <input 
              v-model="editForm.amount"
              type="number" 
              required
              class="w-full bg-slate-900/50 border border-slate-600 rounded-lg pl-7 pr-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
              placeholder="0"
            >
          </div>
        </div>

        <!-- Note -->
        <div>
          <label class="block text-sm font-medium text-slate-400 mb-1">備註</label>
          <input 
            v-model="editForm.note"
            type="text" 
            required
            class="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
            placeholder="請輸入備註"
          >
        </div>

        <!-- Date -->
        <div>
          <label class="block text-sm font-medium text-slate-400 mb-1">日期</label>
          <el-date-picker
            v-model="editForm.date"
            type="date"
            placeholder="選擇日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            class="w-full"
            :teleported="false"
          />
        </div>

        <!-- Actions -->
        <div class="grid grid-cols-2 gap-3 mt-6">
          <button 
            type="button"
            @click="showEditModal = false"
            class="px-4 py-2 rounded-xl bg-slate-700 text-slate-300 hover:bg-slate-600 font-bold transition-colors"
          >
            取消
          </button>
          <button 
            type="submit"
            class="px-4 py-2 rounded-xl text-white font-bold shadow-lg transition-all transform hover:-translate-y-0.5"
            :class="editForm.type === 'income' ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20' : 'bg-rose-600 hover:bg-rose-500 shadow-rose-500/20'"
          >
            儲存變更
          </button>
        </div>
      </form>
    </BaseModal>
  </div>
</template>
