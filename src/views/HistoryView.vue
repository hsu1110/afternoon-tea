<script setup>
import { ref, onMounted, computed } from 'vue';
import { History, RefreshCw, Calendar, Crown, Clock, User, Coffee } from 'lucide-vue-next';
import BaseModal from '../components/BaseModal.vue';

const historySessions = ref([]);
const selectedSession = ref(null);
const showDetails = ref(false);

const loadHistory = async () => {
  try {
    const history = await window.electronAPI.getHistory();
    historySessions.value = (history || [])
      .map(session => ({
        ...session,
        shopName: session.shopName || '未知店家',
        orders: session.orders || []
      }))
      .sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
  } catch (error) {
    console.error('Failed to load history:', error);
  }
};

const openDetails = (session) => {
  selectedSession.value = session;
  showDetails.value = true;
};

const formatDate = (isoString) => {
  if (!isoString) return '未知時間';
  return new Date(isoString).toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const calculateTotal = (orders) => {
  return orders.reduce((sum, order) => {
    if (order.isSelfPay) return sum;
    return sum + (order.price || 0);
  }, 0);
};

onMounted(() => {
  loadHistory();
});
</script>

<template>
  <div class="space-y-6 max-w-4xl mx-auto">
    <!-- Header -->
    <div class="flex justify-between items-center">
      <h1 class="text-3xl font-bold text-white flex items-center gap-3">
        <History class="w-8 h-8 text-blue-400 stroke-[1.5]" />
        <span>歷史紀錄</span>
      </h1>
      <button 
        @click="loadHistory" 
        class="p-2.5 bg-slate-800/80 hover:bg-slate-700/60 border border-slate-700/60 rounded-xl text-slate-400 hover:text-white transition-all shadow-md flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        title="重新整理"
      >
        <RefreshCw class="w-4.5 h-4.5" />
      </button>
    </div>

    <!-- History List / Empty State -->
    <div v-if="historySessions.length === 0" class="text-center py-20 flex flex-col items-center justify-center">
      <div class="p-8 bg-slate-800/40 border border-slate-700/60 rounded-3xl shadow-xl backdrop-blur-md mb-6 max-w-sm w-full mx-auto relative overflow-hidden group">
        <div class="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
        <div class="relative z-10 flex flex-col items-center">
          <div class="p-4 bg-slate-900/60 border border-slate-700/50 rounded-2xl mb-4 text-slate-500 group-hover:text-blue-400 group-hover:border-blue-500/30 transition-all duration-300">
            <History class="w-10 h-10 stroke-[1.5] animate-pulse" />
          </div>
          <h2 class="text-lg font-bold text-white mb-2 tracking-tight">目前沒有歷史紀錄</h2>
          <p class="text-xs text-slate-400 leading-relaxed">當有下午茶開團完成結單後，紀錄將會呈現在這裡。</p>
        </div>
      </div>
    </div>

    <div v-else class="grid gap-4">
      <div 
        v-for="session in historySessions" 
        :key="session.id"
        @click="openDetails(session)"
        class="bg-slate-800/80 backdrop-blur-md border border-slate-700/60 hover:border-blue-500/40 rounded-2xl p-5 cursor-pointer transition-all hover:bg-slate-800 hover:shadow-lg shadow-black/5 flex justify-between items-center group relative overflow-hidden"
      >
        <div class="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/0 to-blue-500/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
        
        <div class="flex items-center gap-4 relative z-10">
          <div class="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-md group-hover:scale-105 transition-transform duration-300">
            {{ session.shopName[0] }}
          </div>
          <div class="space-y-1">
            <h3 class="text-lg font-bold text-white group-hover:text-blue-400 transition-colors">
              {{ session.shopName }}
            </h3>
            <div class="text-xs text-slate-400 flex items-center gap-3">
              <span class="flex items-center gap-1">
                <Calendar class="w-3.5 h-3.5 text-slate-500" />
                <span>{{ formatDate(session.startTime) }}</span>
              </span>
              <span v-if="session.hostName" class="bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-lg flex items-center gap-1 font-normal scale-95 origin-left">
                <Crown class="w-3 h-3 text-indigo-400" />
                <span>{{ session.hostName }}</span>
              </span>
            </div>
          </div>
        </div>
        
        <div class="text-right relative z-10">
          <div class="text-xl font-normal text-emerald-400 font-mono drop-shadow-[0_0_6px_rgba(52,211,153,0.15)]">
            ${{ session.finalAmount || calculateTotal(session.orders) }}
          </div>
          <div class="text-xs text-slate-500 mt-1">
            {{ session.orders.length }} 筆訂單
          </div>
        </div>
      </div>
    </div>

    <!-- Details Modal -->
    <BaseModal 
      :is-open="showDetails" 
      max-width="max-w-2xl" 
      custom-class="p-6" 
      @close="showDetails = false"
    >
      <div v-if="selectedSession">
        <div class="flex justify-between items-start mb-6 border-b border-slate-700 pb-4">
          <div>
            <h2 class="text-3xl font-bold text-white mb-1 flex items-center gap-2">
              <Coffee class="w-7 h-7 text-blue-400 stroke-[1.5]" />
              <span>{{ selectedSession.shopName }}</span>
            </h2>
            <div class="text-slate-400 text-sm flex items-center gap-1.5 mt-2">
              <Calendar class="w-4 h-4 text-slate-500" />
              <span>{{ formatDate(selectedSession.startTime) }}</span>
            </div>
          </div>
          <div class="text-right">
            <div class="text-4xl font-normal text-emerald-400 font-mono drop-shadow-[0_0_8px_rgba(52,211,153,0.15)]">
              ${{ selectedSession.finalAmount || calculateTotal(selectedSession.orders) }}
            </div>
            <div v-if="selectedSession.hostName" class="text-indigo-300 text-sm mt-2 flex items-center gap-1.5 justify-end font-normal">
              <Crown class="w-4 h-4 text-indigo-400" />
              <span>負責人：{{ selectedSession.hostName }}</span>
            </div>
          </div>
        </div>

        <div class="space-y-3 max-h-[50vh] overflow-y-auto custom-scrollbar pr-2">
          <div 
            v-for="order in selectedSession.orders" 
            :key="order.id"
            class="flex justify-between items-center bg-slate-900/40 border border-slate-700/30 p-4 rounded-xl hover:border-slate-600/40 transition-colors"
          >
            <div>
              <div class="font-normal text-slate-200 flex items-center gap-2">
                <span class="text-slate-100 text-lg">{{ order.name }}</span>
                <span v-if="order.isSelfPay" class="text-xs font-normal bg-amber-500/10 border border-amber-500/20 text-amber-400 px-2 py-0.5 rounded-md">自費</span>
              </div>
              <div class="flex flex-col gap-1.5 mt-1.5">
                <span class="text-slate-300 text-base font-normal">{{ order.item }}</span>
                <div v-if="order.note" class="flex flex-wrap gap-1">
                  <span 
                    v-for="notePart in order.note.split('、')" 
                    :key="notePart"
                    class="text-xs bg-slate-800/80 border border-slate-700/40 text-slate-400 px-2.5 py-0.5 rounded-md font-normal inline-block"
                  >
                    {{ notePart }}
                  </span>
                </div>
              </div>
            </div>
            <div class="font-mono font-normal text-lg text-right" :class="order.isSelfPay ? 'text-slate-500 line-through' : 'text-emerald-400 drop-shadow-[0_0_6px_rgba(52,211,153,0.1)]'">
              ${{ order.price }}
            </div>
          </div>
        </div>

        <div class="mt-6 flex justify-end">
          <button 
            @click="showDetails = false"
            class="px-6 py-2.5 bg-slate-800 hover:bg-slate-700/80 border border-slate-700/60 hover:text-white text-slate-300 rounded-xl font-normal text-base transition-all"
          >
            關閉
          </button>
        </div>
      </div>
    </BaseModal>
  </div>
</template>
