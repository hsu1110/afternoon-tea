<script setup>
import { ref, onMounted, computed, inject, watch } from 'vue';

const triggerToast = inject('triggerToast');
const triggerConfirm = inject('triggerConfirm');

const activeSessions = ref([]);
const selectedSessionId = ref(null);
const menuImage = ref(null);
const currentUser = ref(localStorage.getItem('lastUser') || '');
const currentItem = ref('');
const currentPrice = ref('');
const currentNote = ref('');
const isSubmitting = ref(false);

const selectedSession = computed(() => {
  return activeSessions.value.find(s => s.id === selectedSessionId.value);
});

const timeLeft = computed(() => {
  if (!selectedSession.value || !selectedSession.value.deadline) return '';
  const now = new Date();
  const deadline = new Date(selectedSession.value.deadline);
  const diff = deadline - now;
  
  if (diff <= 0) return '已截止';
  
  const minutes = Math.floor(diff / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return `${minutes}分${seconds}秒`;
});

const isLocked = computed(() => {
  return timeLeft.value === '已截止';
});

// 載入資料
const loadData = async () => {
  try {
    const data = await window.electronAPI.getOrders();
    activeSessions.value = Array.isArray(data.activeSessions) ? data.activeSessions : (data.activeSession ? [data.activeSession] : []);
    
    // 如果沒有選中的 session，預設選第一個
    if (activeSessions.value.length > 0 && !selectedSessionId.value) {
      selectedSessionId.value = activeSessions.value[0].id;
    }
    
    // 如果選中的 session 已經不存在，重置
    if (selectedSessionId.value && !activeSessions.value.find(s => s.id === selectedSessionId.value)) {
      selectedSessionId.value = activeSessions.value.length > 0 ? activeSessions.value[0].id : null;
    }

    if (selectedSession.value) {
      loadMenuImage(selectedSession.value.shopId);
    }
  } catch (error) {
    console.error('Failed to load data:', error);
  }
};

const loadMenuImage = async (shopId) => {
  try {
    menuImage.value = await window.electronAPI.getMenuImage(shopId);
  } catch (error) {
    console.error('Failed to load menu image:', error);
  }
};

// 監聽 session 切換
watch(selectedSessionId, (newId) => {
  if (newId) {
    const session = activeSessions.value.find(s => s.id === newId);
    if (session) {
      loadMenuImage(session.shopId);
      // 嘗試載入上次點餐紀錄
      if (currentUser.value) {
        quickFillLastOrder();
      }
    }
  }
});

// 快速帶入上次點餐
const quickFillLastOrder = async () => {
  if (!currentUser.value || !selectedSession.value) return;
  
  try {
    const lastOrder = await window.electronAPI.getLastOrder(currentUser.value, selectedSession.value.shopId);
    if (lastOrder) {
      currentItem.value = lastOrder.item;
      currentPrice.value = lastOrder.price;
      currentNote.value = lastOrder.note || '';
      triggerToast('已帶入上次點餐紀錄');
    }
  } catch (error) {
    console.error('Failed to load last order:', error);
  }
};

const submitOrder = async () => {
  if (!currentUser.value || !currentItem.value || !currentPrice.value) {
    triggerToast('請填寫完整資訊');
    return;
  }

  if (isLocked.value) {
    triggerToast('已截止，無法點餐');
    return;
  }

  isSubmitting.value = true;
  try {
    const order = {
      sessionId: selectedSessionId.value,
      name: currentUser.value,
      item: currentItem.value,
      price: Number(currentPrice.value),
      note: currentNote.value
    };

    await window.electronAPI.submitOrder(order);
    
    // Save user preference
    localStorage.setItem('lastUser', currentUser.value);
    
    // Reset form (keep user)
    currentItem.value = '';
    currentPrice.value = '';
    currentNote.value = '';
    
    await loadData();
    triggerToast('點餐成功！');
  } catch (error) {
    console.error('Failed to submit order:', error);
    triggerToast(error.message || '點餐失敗');
  } finally {
    isSubmitting.value = false;
  }
};

const deleteOrder = async (orderId) => {
  const confirmed = await triggerConfirm({
    title: '刪除訂單',
    message: '確定要刪除這筆訂單嗎？',
    confirmText: '刪除',
    type: 'warning'
  });

  if (confirmed) {
    try {
      await window.electronAPI.deleteOrder(orderId);
      await loadData();
      triggerToast('已刪除訂單');
    } catch (error) {
      triggerToast('刪除失敗');
    }
  }
};

onMounted(() => {
  loadData();
  // Auto refresh
  setInterval(loadData, 5000);
  // Timer for countdown
  setInterval(() => {
    // Just trigger reactivity
    activeSessions.value = [...activeSessions.value]; 
  }, 1000);
});
</script>

<template>
  <div class="max-w-4xl mx-auto">
    
    <!-- No Active Session -->
    <div v-if="activeSessions.length === 0" class="text-center py-20">
      <div class="text-6xl mb-6 animate-bounce">😴</div>
      <h2 class="text-2xl font-bold text-white mb-2">目前沒有進行中的團購</h2>
      <p class="text-slate-400">請稍後再回來查看，或通知主持人開團！</p>
    </div>

    <div v-else>
      <!-- Session Tabs -->
      <div class="flex gap-2 overflow-x-auto pb-4 mb-4 custom-scrollbar">
        <button 
          v-for="session in activeSessions" 
          :key="session.id"
          @click="selectedSessionId = session.id"
          class="px-6 py-3 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-2"
          :class="selectedSessionId === session.id 
            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 scale-105' 
            : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'"
        >
          <span>{{ session.shopName }}</span>
          <span class="text-xs bg-black/20 px-2 py-0.5 rounded-full">{{ session.orders.length }}</span>
        </button>
      </div>

      <div v-if="selectedSession" class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        <!-- Left: Menu & Info -->
        <div class="space-y-6">
          <div class="bg-slate-800/80 backdrop-blur-md border border-slate-600 rounded-2xl p-6 shadow-xl">
            <h2 class="text-2xl font-bold text-white mb-4 flex justify-between items-center">
              <span>{{ selectedSession.shopName }} 菜單</span>
              <span v-if="selectedSession.deadline" class="text-sm font-mono px-3 py-1 rounded-full" 
                :class="isLocked ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'">
                {{ timeLeft }}
              </span>
            </h2>
            
            <!-- Menu Image -->
            <div class="aspect-[3/4] bg-slate-900/50 rounded-xl overflow-hidden border border-slate-700 relative group cursor-zoom-in">
              <img v-if="menuImage" :src="menuImage" class="w-full h-full object-contain hover:scale-110 transition-transform duration-500" alt="Menu">
              <div v-else class="w-full h-full flex items-center justify-center text-slate-500">
                尚無菜單圖片
              </div>
            </div>
          </div>
        </div>

        <!-- Right: Order Form & List -->
        <div class="space-y-6">
          
          <!-- Order Form -->
          <div class="bg-slate-800/80 backdrop-blur-md border border-slate-600 rounded-2xl p-6 shadow-xl sticky top-6">
            <h3 class="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <span>📝</span> 我要點餐
            </h3>
            
            <form @submit.prevent="submitOrder" class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-slate-400 mb-1">姓名</label>
                <input 
                  v-model="currentUser"
                  @blur="quickFillLastOrder"
                  type="text" 
                  required
                  class="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
                  placeholder="輸入姓名自動帶入上次紀錄"
                >
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-slate-400 mb-1">品項</label>
                  <input 
                    v-model="currentItem"
                    type="text" 
                    required
                    class="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
                    placeholder="例如：珍珠奶茶"
                  >
                </div>
                <div>
                  <label class="block text-sm font-medium text-slate-400 mb-1">價格</label>
                  <input 
                    v-model="currentPrice"
                    type="number" 
                    required
                    class="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
                    placeholder="50"
                  >
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-slate-400 mb-1">備註 (甜度冰塊)</label>
                <input 
                  v-model="currentNote"
                  type="text" 
                  class="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
                  placeholder="例如：微糖少冰"
                >
              </div>

              <button 
                type="submit"
                :disabled="isSubmitting || isLocked"
                class="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded-xl font-bold shadow-lg shadow-green-500/20 transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {{ isLocked ? '已截止' : (isSubmitting ? '送出中...' : '送出訂單') }}
              </button>
            </form>
          </div>

          <!-- Current Orders List -->
          <div class="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-6">
            <h3 class="text-lg font-bold text-white mb-4">
              {{ selectedSession.shopName }} 的訂單 ({{ selectedSession.orders.length }})
            </h3>
            
            <div class="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
              <div v-for="order in selectedSession.orders" :key="order.id" 
                class="bg-slate-900/80 p-3 rounded-lg border border-slate-700/50 flex justify-between items-center group hover:border-slate-600 transition-colors"
              >
                <div>
                  <div class="font-bold text-white text-sm">{{ order.name }}</div>
                  <div class="text-xs text-slate-400">{{ order.item }} <span v-if="order.note" class="text-slate-500">({{ order.note }})</span></div>
                </div>
                <div class="flex items-center gap-3">
                  <span class="font-mono font-bold text-green-400 text-sm">${{ order.price }}</span>
                  <button 
                    v-if="order.name === currentUser"
                    @click="deleteOrder(order.id)"
                    class="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="刪除"
                  >
                    🗑️
                  </button>
                </div>
              </div>
              
              <div v-if="selectedSession.orders.length === 0" class="text-center text-slate-500 py-4 text-sm">
                還沒有人點餐，搶頭香！
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  height: 6px;
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(30, 41, 59, 0.5);
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(71, 85, 105, 0.8);
  border-radius: 3px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(100, 116, 139, 1);
}
</style>
