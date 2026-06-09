<script setup>
import { ref, onMounted, computed, inject } from 'vue';
import { Wallet, Coins, Plus, Minus, ArrowDownLeft, ArrowUpRight, Edit2, Trash2, Calendar, FileText } from 'lucide-vue-next';
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
    date: record.date.split('T')[0]
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
  <div class="w-full max-w-4xl mx-auto space-y-6">
    <!-- Balance Card -->
    <div class="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-3xl p-8 shadow-xl mb-2 text-white relative overflow-hidden group">
      <div class="absolute right-0 top-1/2 -translate-y-1/2 translate-x-8 text-white/5 group-hover:scale-105 group-hover:rotate-6 transition-transform duration-500 pointer-events-none">
        <Coins class="w-64 h-64 stroke-[1]" />
      </div>
      <div class="relative z-10 flex justify-between items-center">
        <div>
          <h2 class="text-sm font-normal opacity-85 mb-2 tracking-wide uppercase">公費總餘額</h2>
          <div class="text-5xl font-normal font-mono tracking-tight flex items-baseline gap-1 drop-shadow-md">
            <span class="text-3xl opacity-80">$</span>
            <span>{{ balance.toLocaleString() }}</span>
          </div>
        </div>
        <div class="p-4 bg-white/10 rounded-2xl backdrop-blur-md border border-white/10 shadow-inner">
          <Wallet class="w-8 h-8 text-white stroke-[1.5]" />
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <!-- Transaction Form -->
      <div class="md:col-span-1 bg-slate-800/80 backdrop-blur-md border border-slate-700/60 rounded-2xl p-6 shadow-xl h-fit space-y-5">
        <h3 class="text-xl font-bold text-white flex items-center gap-2 tracking-tight">
          <Wallet class="w-5.5 h-5.5 text-blue-400 stroke-[1.5]" />
          <span>記帳</span>
        </h3>
        
        <form @submit.prevent="submitTransaction" class="space-y-4">
          <div class="flex bg-slate-900/50 p-1.5 rounded-xl border border-slate-700/60">
            <button 
              type="button"
              @click="transactionForm.type = 'income'"
              class="flex-1 py-2.5 rounded-lg text-sm font-normal transition-all"
              :class="transactionForm.type === 'income' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.1)]' : 'text-slate-400 hover:text-slate-300 border border-transparent'"
            >
              收入 (儲值)
            </button>
            <button 
              type="button"
              @click="transactionForm.type = 'expense'"
              class="flex-1 py-2.5 rounded-lg text-sm font-normal transition-all"
              :class="transactionForm.type === 'expense' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 shadow-[0_0_12px_rgba(244,63,94,0.1)]' : 'text-slate-400 hover:text-slate-300 border border-transparent'"
            >
              支出 (買單)
            </button>
          </div>

          <div class="space-y-1.5">
            <label class="block text-sm font-normal text-slate-400">金額</label>
            <div class="relative">
              <span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-base font-normal">$</span>
              <input 
                v-model="transactionForm.amount"
                type="number" 
                required
                class="w-full bg-slate-900/50 border border-slate-700/60 rounded-xl pl-8 pr-4 py-3 text-white placeholder-slate-550 focus:outline-none focus:border-blue-500 transition-all font-normal text-base shadow-sm" 
                placeholder="0"
              >
            </div>
          </div>

          <div class="space-y-1.5">
            <label class="block text-sm font-normal text-slate-400">備註</label>
            <input 
              v-model="transactionForm.note"
              type="text" 
              required
              class="w-full bg-slate-900/50 border border-slate-700/60 rounded-xl px-4 py-3 text-white placeholder-slate-550 focus:outline-none focus:border-blue-500 transition-all font-normal text-base shadow-sm" 
              placeholder="例如：xxx 生日斗內、50 嵐"
            >
          </div>

          <button 
            type="submit"
            class="w-full py-3.5 rounded-xl font-normal text-base shadow-md transition-all mt-2 text-white flex items-center justify-center gap-2"
            :class="transactionForm.type === 'income' ? 'bg-emerald-600 hover:bg-emerald-555 shadow-emerald-500/10' : 'bg-rose-600 hover:bg-rose-555 shadow-rose-500/10'"
          >
            <Plus v-if="transactionForm.type === 'income'" class="w-4 h-4" />
            <Minus v-else class="w-4 h-4" />
            <span>{{ transactionForm.type === 'income' ? '新增收入' : '新增支出' }}</span>
          </button>
        </form>
      </div>

      <!-- Transaction History -->
      <div class="md:col-span-2 bg-slate-800/80 backdrop-blur-md border border-slate-700/60 rounded-2xl p-6 shadow-xl space-y-5">
        <h3 class="text-xl font-bold text-white flex items-center gap-2 tracking-tight">
          <FileText class="w-5.5 h-5.5 text-blue-400 stroke-[1.5]" />
          <span>交易紀錄</span>
        </h3>
        
        <div class="space-y-2.5 max-h-[420px] overflow-y-auto custom-scrollbar pr-2">
          <div v-if="funds.length === 0" class="text-center text-slate-500 py-12 flex flex-col items-center">
            <Coins class="w-10 h-10 text-slate-600 mb-3 stroke-[1.5]" />
            <span class="text-sm">目前沒有交易紀錄</span>
          </div>
          
          <div 
            v-for="record in funds.slice().reverse()" 
            :key="record.id" 
            class="flex justify-between items-center p-4 rounded-xl border transition-all hover:bg-slate-700/25 group"
            :class="record.type === 'income' ? 'bg-emerald-950/10 border-emerald-500/10 hover:border-emerald-500/20' : 'bg-rose-955/10 border-rose-500/10 hover:border-rose-500/20'"
          >
            <div class="flex items-center gap-4">
              <div 
                class="w-10 h-10 rounded-xl flex items-center justify-center"
                :class="record.type === 'income' ? 'bg-emerald-500/10 text-emerald-450 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-450 border border-rose-500/20'"
              >
                <ArrowDownLeft v-if="record.type === 'income'" class="w-5 h-5 stroke-[2]" />
                <ArrowUpRight v-else class="w-5 h-5 stroke-[2]" />
              </div>
              <div class="space-y-1">
                <div class="font-normal text-slate-200 text-sm">{{ record.note }}</div>
                <div class="text-[10px] text-slate-500 flex items-center gap-1">
                  <Calendar class="w-3 h-3 text-slate-600" />
                  <span>{{ new Date(record.date).toLocaleDateString() }}</span>
                </div>
              </div>
            </div>
            
            <div class="flex items-center gap-4">
              <div 
                class="font-mono font-normal text-base"
                :class="record.type === 'income' ? 'text-emerald-400' : 'text-rose-400'"
              >
                {{ record.type === 'income' ? '+' : '-' }}${{ record.amount }}
              </div>
              
              <!-- Action Buttons (Visible on Hover) -->
              <div class="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  @click="openEditModal(record)"
                  class="p-1.5 rounded-lg bg-slate-750 text-blue-400 hover:bg-blue-600 hover:text-white transition-colors"
                  title="編輯"
                >
                  <Edit2 class="w-3.5 h-3.5" />
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
                      class="p-1.5 rounded-lg bg-slate-750 text-rose-450 hover:bg-rose-600 hover:text-white transition-colors"
                      title="刪除"
                    >
                      <Trash2 class="w-3.5 h-3.5" />
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
    <BaseModal 
      :is-open="showEditModal" 
      max-width="max-w-md" 
      custom-class="p-6" 
      @close="showEditModal = false"
    >
      <h3 class="text-2xl font-bold text-white mb-6 text-center">編輯交易紀錄</h3>
      
      <form @submit.prevent="saveEdit" class="space-y-4">
        <!-- Type Selection -->
        <div class="flex bg-slate-900/50 p-1.5 rounded-xl border border-slate-700/60">
          <button 
            type="button"
            @click="editForm.type = 'income'"
            class="flex-1 py-2.5 rounded-lg text-sm font-normal transition-all"
            :class="editForm.type === 'income' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.1)]' : 'text-slate-400 hover:text-slate-305 border border-transparent'"
          >
            收入
          </button>
          <button 
            type="button"
            @click="editForm.type = 'expense'"
            class="flex-1 py-2.5 rounded-lg text-sm font-normal transition-all"
            :class="editForm.type === 'expense' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 shadow-[0_0_12px_rgba(244,63,94,0.1)]' : 'text-slate-400 hover:text-slate-305 border border-transparent'"
          >
            支出
          </button>
        </div>

        <!-- Amount -->
        <div class="space-y-1.5">
          <label class="block text-sm font-normal text-slate-400">金額</label>
          <div class="relative">
            <span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-base font-normal">$</span>
            <input 
              v-model="editForm.amount"
              type="number" 
              required
              class="w-full bg-slate-900/50 border border-slate-700/60 rounded-xl pl-8 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all font-normal text-lg shadow-sm" 
              placeholder="0"
            >
          </div>
        </div>

        <!-- Note -->
        <div class="space-y-1.5">
          <label class="block text-sm font-normal text-slate-400">備註</label>
          <input 
            v-model="editForm.note"
            type="text" 
            required
            class="w-full bg-slate-900/50 border border-slate-700/60 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all font-normal text-lg shadow-sm" 
            placeholder="請輸入備註"
          >
        </div>

        <!-- Date -->
        <div class="space-y-1.5">
          <label class="block text-sm font-normal text-slate-400">日期</label>
          <el-date-picker
            v-model="editForm.date"
            type="date"
            placeholder="選擇日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            class="w-full text-base"
            :teleported="false"
          />
        </div>

        <!-- Actions -->
        <div class="grid grid-cols-2 gap-3 mt-6">
          <button 
            type="button"
            @click="showEditModal = false"
            class="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-705 border border-slate-700/60 hover:text-white text-slate-350 font-normal text-base transition-all"
          >
            取消
          </button>
          <button 
            type="submit"
            class="px-4 py-2.5 rounded-xl text-white font-normal shadow-lg transition-all transform hover:-translate-y-0.5 text-base"
            :class="editForm.type === 'income' ? 'bg-emerald-600 hover:bg-emerald-555 shadow-emerald-500/10' : 'bg-rose-600 hover:bg-rose-555 shadow-rose-500/10'"
          >
            儲存變更
          </button>
        </div>
      </form>
    </BaseModal>
  </div>
</template>
