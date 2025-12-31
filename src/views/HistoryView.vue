<script setup>
import { ref, onMounted, computed } from 'vue';
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
  return new Date(isoString).toLocaleString();
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
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <h1 class="text-3xl font-bold text-white flex items-center gap-3">
        <span>📜</span> 歷史紀錄
      </h1>
      <button 
        @click="loadHistory" 
        class="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
        title="重新整理"
      >
        🔄
      </button>
    </div>

    <!-- History List -->
    <div v-if="historySessions.length === 0" class="text-center py-20 text-slate-500">
      <div class="text-4xl mb-4">🕸️</div>
      <p class="text-xl">目前沒有歷史紀錄</p>
    </div>

    <div v-else class="grid gap-4">
      <div 
        v-for="session in historySessions" 
        :key="session.id"
        @click="openDetails(session)"
        class="bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-blue-500/50 rounded-xl p-4 cursor-pointer transition-all group"
      >
        <div class="flex justify-between items-center">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 bg-slate-700 rounded-full flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
              {{ session.shopName[0] }}
            </div>
            <div>
              <h3 class="text-lg font-bold text-white group-hover:text-blue-400 transition-colors">
                {{ session.shopName }}
              </h3>
              <div class="text-sm text-slate-400 flex items-center gap-3">
                <span>📅 {{ formatDate(session.startTime) }}</span>
                <span v-if="session.hostName" class="bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded text-xs">
                  👑 {{ session.hostName }}
                </span>
              </div>
            </div>
          </div>
          
          <div class="text-right">
            <div class="text-xl font-bold text-green-400 font-mono">
              ${{ session.finalAmount || calculateTotal(session.orders) }}
            </div>
            <div class="text-sm text-slate-500">
              {{ session.orders.length }} 筆訂單
            </div>
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
            <h2 class="text-2xl font-bold text-white mb-1">{{ selectedSession.shopName }}</h2>
            <div class="text-slate-400 text-sm">
              {{ formatDate(selectedSession.startTime) }}
            </div>
          </div>
          <div class="text-right">
            <div class="text-3xl font-bold text-green-400 font-mono">
              ${{ selectedSession.finalAmount || calculateTotal(selectedSession.orders) }}
            </div>
            <div v-if="selectedSession.hostName" class="text-indigo-300 text-sm mt-1">
              負責人：{{ selectedSession.hostName }}
            </div>
          </div>
        </div>

        <div class="space-y-3 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
          <div 
            v-for="order in selectedSession.orders" 
            :key="order.id"
            class="flex justify-between items-center bg-slate-900/50 p-3 rounded-lg"
          >
            <div>
              <div class="font-bold text-white flex items-center gap-2">
                {{ order.name }}
                <span v-if="order.isSelfPay" class="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded border border-yellow-500/30">自費</span>
              </div>
              <div class="text-sm text-slate-400">
                {{ order.item }}
                <span v-if="order.note" class="text-slate-500 ml-1">({{ order.note }})</span>
              </div>
            </div>
            <div class="font-mono font-bold" :class="order.isSelfPay ? 'text-slate-500 line-through' : 'text-slate-300'">
              ${{ order.price }}
            </div>
          </div>
        </div>

        <div class="mt-6 flex justify-end">
          <button 
            @click="showDetails = false"
            class="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold transition-colors"
          >
            關閉
          </button>
        </div>
      </div>
    </BaseModal>
  </div>
</template>
