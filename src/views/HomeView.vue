<script setup>
import { ref, onMounted, inject, computed } from 'vue';
import Wheel from '../components/Wheel.vue';
import BaseModal from '../components/BaseModal.vue';

const triggerToast = inject('triggerToast');
const triggerConfirm = inject('triggerConfirm');

const activeSessions = ref([]);
const showWheel = ref(false);
const shops = ref([]);
const members = ref([]);

// Wheel & Result Modal State
const wheelRef = ref(null);
const selectedShop = ref(null);
const showResult = ref(false);
const deadline = ref(null);
const selectedHost = ref(null);
const wheelCategory = ref('drink'); // 'drink' or 'food'

// UX Improvements State
const showShopSelector = ref(false);
const showEditDeadlineModal = ref(false);
const editingSession = ref(null);
const editingDeadline = ref(null);

// 載入資料
const loadData = async (isInitial = false) => {
  try {
    const data = await window.electronAPI.getOrders();
    activeSessions.value = Array.isArray(data.activeSessions) ? data.activeSessions : (data.activeSession ? [data.activeSession] : []);
    const allShops = await window.electronAPI.getShops();
    shops.value = allShops.map(s => ({ ...s, category: s.category || 'drink' }));
    members.value = await window.electronAPI.getMembers();
    
    // Only auto-show wheel on initial load if no sessions
    if (isInitial && activeSessions.value.length === 0) {
      showWheel.value = true;
    }
  } catch (error) {
    console.error('Failed to load data:', error);
  }
};

const wheelShops = computed(() => {
  return shops.value.filter(s => s.category === wheelCategory.value);
});

// 抽獎結束
const onSpinEnd = (shop) => {
  selectedShop.value = shop;
  // Default deadline: +30 mins
  const now = new Date();
  now.setMinutes(now.getMinutes() + 30);
  deadline.value = now;
  selectedHost.value = null; // Reset host
  
  showResult.value = true;
};

// 確認開團
const confirmSession = async () => {
  if (!selectedShop.value) return;

  try {
    const shopData = JSON.parse(JSON.stringify(selectedShop.value));
    const deadlineISO = deadline.value ? deadline.value.toISOString() : null;
    const hostData = selectedHost.value ? JSON.parse(JSON.stringify(selectedHost.value)) : null;
    
    const newSession = await window.electronAPI.startSession(shopData, deadlineISO, hostData);
    await window.electronAPI.updateWeights(shopData.id);
    
    activeSessions.value.push(newSession);
    
    // Refresh shops to update weights
    const allShops = await window.electronAPI.getShops();
    shops.value = allShops.map(s => ({ ...s, category: s.category || 'drink' }));

    showResult.value = false;
    showWheel.value = false;
    triggerToast(`已開啟 ${shopData.name} 訂購！`);
  } catch (error) {
    console.error('Failed to start session:', error);
    triggerToast('開團失敗');
  }
};

// 匯出報表
const handleExport = async (session) => {
  if (!window.electronAPI || !window.electronAPI.exportOrders) {
    console.error('electronAPI.exportOrders is missing');
    triggerToast('系統錯誤：無法匯出');
    return;
  }
  
  try {
    const result = await window.electronAPI.exportOrders(session.id);
    if (result.success) {
      triggerToast(`報表已匯出至：${result.filePath}`);
    } else {
      triggerToast(result.message || '匯出失敗');
    }
  } catch (error) {
    console.error('Export error:', error);
    triggerToast('匯出發生錯誤');
  }
};

// 直接選擇店家
const openShopSelector = () => {
  showShopSelector.value = true;
};

const selectShop = (shop) => {
  showShopSelector.value = false;
  onSpinEnd(shop);
};

// 開啟修改截止時間 Modal
const openEditDeadline = (session) => {
  editingSession.value = session;
  editingDeadline.value = session.deadline ? new Date(session.deadline) : new Date();
  showEditDeadlineModal.value = true;
};

// 確認修改截止時間
const confirmEditDeadline = async () => {
  if (!editingSession.value || !editingDeadline.value) return;
  
  try {
    await window.electronAPI.updateSession({
      id: editingSession.value.id,
      deadline: editingDeadline.value.toISOString()
    });
    
    await loadData();
    showEditDeadlineModal.value = false;
    triggerToast('截止時間已更新');
  } catch (error) {
    console.error('Update deadline error:', error);
    triggerToast('更新失敗');
  }
};

// 複製訂購連結文字
const copyGroupBuyText = (session) => {
  const deadlineTime = session.deadline ? new Date(session.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '無';
  const hostText = session.hostName ? `負責人：${session.hostName}` : '';
  const text = `
下午茶開團囉！🎉
店家：${session.shopName}
${hostText}
截止時間：${deadlineTime}

請大家盡快點餐喔！
  `.trim();
  
  navigator.clipboard.writeText(text).then(() => {
    triggerToast('已複製開團文案！');
  });
};

// 計算總金額 (含自費)
const calculateTotal = (orders) => {
  return orders.reduce((sum, order) => sum + (order.price || 0), 0);
};

// 計算公費金額 (排除自費)
const calculatePublicTotal = (orders) => {
  return orders.reduce((sum, order) => {
    if (order.isSelfPay) return sum;
    return sum + (order.price || 0);
  }, 0);
};

// 計算自費總額
const calculateSelfPayTotal = (orders) => {
  return orders.reduce((sum, order) => {
    if (!order.isSelfPay) return sum;
    return sum + (order.price || 0);
  }, 0);
};

// 手動轉盤
const handleSpin = () => {
  if (wheelRef.value) {
    wheelRef.value.spin();
  }
};

// 結帳
const handleCheckout = async (session) => {
  const total = calculateTotal(session.orders);
  const publicTotal = calculatePublicTotal(session.orders);
  const selfPayTotal = calculateSelfPayTotal(session.orders);
  
  let message = `確定要結帳 ${session.shopName} 嗎？\n總金額：$${total}`;
  if (selfPayTotal > 0) {
    message += `\n(公費支出：$${publicTotal}, 自費代墊：$${selfPayTotal})`;
  }
  
  const confirmed = await triggerConfirm({
    title: '結帳確認',
    message: message,
    confirmText: '確定結帳',
    type: 'success'
  });

  if (confirmed) {
    try {
      // 這裡只傳入公費金額，因為自費的不應該從公費扣除
      await window.electronAPI.checkoutSession(publicTotal, session.shopName, session.id);
      await loadData(); // Reload to remove from list
      triggerToast('結帳完成！已記入帳本');
    } catch (error) {
      console.error('Checkout error:', error);
      triggerToast('結帳失敗');
    }
  }
};

// 取消開團
const handleCancel = async (session) => {
  const confirmed = await triggerConfirm({
    title: '取消開團',
    message: `確定要取消 ${session.shopName} 的訂購嗎？此操作無法復原。`,
    confirmText: '確定取消',
    type: 'warning'
  });

  if (confirmed) {
    try {
      await window.electronAPI.cancelSession(session.id);
      await loadData();
      triggerToast('已取消開團');
    } catch (error) {
      console.error('Failed to cancel session:', error);
    }
  }
};

onMounted(() => {
  loadData(true);
  setInterval(() => loadData(false), 10000);
});
</script>

<template>
  <div>
    <div class="max-w-6xl mx-auto space-y-8">
      
      <!-- Header / Actions -->
      <div class="flex justify-between items-center bg-slate-800/50 p-4 rounded-2xl backdrop-blur-sm border border-slate-700">
        <h1 class="text-2xl font-bold text-white flex items-center gap-3">
          <span>🎲</span> 下午茶
        </h1>
        <div class="flex gap-3">
          <button 
            v-if="showWheel"
            @click="openShopSelector"
            class="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition-all transform hover:-translate-y-0.5"
          >
            直接選擇店家
          </button>
          <button 
            v-if="!showWheel"
            @click="showWheel = true"
            class="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all transform hover:-translate-y-0.5"
          >
            + 決定下午茶
          </button>
          <button 
            v-else
            @click="showWheel = false"
            class="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold transition-all"
          >
            返回列表
          </button>
        </div>
      </div>

      <!-- Wheel Section -->
      <div v-if="showWheel" class="transition-all duration-500 ease-in-out relative">
        <div class="text-center mb-8">
          <h2 class="text-4xl font-bold text-white mb-2 tracking-tight">今天下午茶吃什麼？</h2>
          <p class="text-slate-400 text-lg">讓命運之輪來決定吧！</p>
          
          <!-- Wheel Category Toggle -->
          <div class="flex justify-center mt-6">
            <div class="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
              <button 
                @click="wheelCategory = 'drink'"
                class="px-6 py-2 rounded-lg font-bold transition-all flex items-center gap-2"
                :class="wheelCategory === 'drink' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'"
              >
                <span>🥤</span> 飲料轉盤
              </button>
              <button 
                @click="wheelCategory = 'food'"
                class="px-6 py-2 rounded-lg font-bold transition-all flex items-center gap-2"
                :class="wheelCategory === 'food' ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'"
              >
                <span>🍱</span> 食物轉盤
              </button>
            </div>
          </div>
        </div>

        <div class="relative mb-12">
          <div class="absolute inset-0 bg-blue-500/20 blur-[100px] rounded-full pointer-events-none"></div>
          
          <div v-if="wheelShops.length > 0">
            <Wheel 
              ref="wheelRef" 
              :shops="wheelShops" 
              @spin-end="onSpinEnd" 
            />
            
            <!-- Spin Button -->
            <div class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-4 z-10">
              <button 
                @click="handleSpin"
                class="w-24 h-24 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full shadow-lg shadow-orange-500/50 flex items-center justify-center text-white font-bold text-2xl hover:scale-110 active:scale-95 transition-all duration-300 border-4 border-slate-900"
              >
                GO!
              </button>
            </div>
          </div>
          
          <div v-else class="text-center py-20 bg-slate-800/50 rounded-3xl border border-slate-700 backdrop-blur-sm max-w-2xl mx-auto">
             <div class="text-6xl mb-4">📭</div>
             <h3 class="text-2xl font-bold text-white mb-2">這個分類還沒有店家</h3>
             <p class="text-slate-400">請先到「店家管理」新增店家喔！</p>
          </div>
        </div>

        <!-- Result Modal -->
        <!-- Result Modal -->
        <BaseModal :is-open="showResult" max-width="max-w-md" custom-class="p-8" @close="showResult = false">
          <div class="text-center">
            <div class="text-6xl mb-4 animate-bounce">🎉</div>
            <h3 class="text-2xl font-bold text-white mb-2">就決定是你了！</h3>
            <div class="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400 mb-6">
              {{ selectedShop?.name }}
            </div>
            
            <div class="bg-slate-900/50 rounded-xl p-4 mb-6 text-left">
              <div class="flex items-center gap-2 mb-2 text-slate-300">
                <span>📞 {{ selectedShop?.phone || '無電話' }}</span>
              </div>
              
              <!-- Deadline Input -->
              <div class="mb-6">
                <label class="block text-sm text-slate-400 mb-2">⏱️ 截止時間</label>
                <el-date-picker
                  v-model="deadline"
                  type="datetime"
                  placeholder="選擇日期時間"
                  format="YYYY-MM-DD HH:mm"
                  class="w-full"
                  :teleported="false"
                />
              </div>

              <!-- Host Selection -->
              <div class="mb-6">
                <label class="block text-sm text-slate-400 mb-2">👑 負責人</label>
                <select 
                  v-model="selectedHost"
                  class="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option :value="null">-- 選擇負責人 --</option>
                  <option v-for="member in members" :key="member.id" :value="member">
                    {{ member.name }}
                  </option>
                </select>
              </div>

              <!-- Action Buttons -->
              <div class="grid grid-cols-2 gap-3 mt-4">
                <button 
                  @click="showResult = false"
                  class="px-4 py-2 rounded-xl bg-slate-700 text-slate-300 hover:bg-slate-600 font-bold transition-colors"
                >
                  重新選擇
                </button>
                <button 
                  @click="confirmSession"
                  class="px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-500 font-bold shadow-lg shadow-blue-500/25 transition-all transform hover:-translate-y-0.5"
                >
                  確認開訂
                </button>
              </div>
            </div>
          </div>
        </BaseModal>
      </div>

      <!-- Active Sessions List -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div v-if="activeSessions.length === 0" class="col-span-full text-center py-20 text-slate-500">
          <div class="text-4xl mb-4">😴</div>
          <p class="text-xl">目前沒有進行中的訂購</p>
          <p class="text-sm mt-2">點擊上方按鈕來決定今天要吃什麼吧！</p>
        </div>

        <div 
          v-for="session in activeSessions" 
          :key="session.id"
          class="bg-slate-800/80 backdrop-blur-md border border-slate-600 rounded-2xl p-6 shadow-xl relative overflow-hidden group hover:border-blue-500/50 transition-all"
        >
          <!-- Background Decoration -->
          <div class="absolute top-0 right-0 p-4 opacity-10 text-9xl font-black select-none pointer-events-none group-hover:opacity-20 transition-opacity">
            {{ session.shopName[0] }}
          </div>

          <!-- Header -->
          <div class="relative z-10 mb-6">
            <div class="flex justify-between items-start">
              <div>
                <h2 class="text-2xl font-bold text-white mb-1">{{ session.shopName }}</h2>
                <div class="flex items-center gap-2 text-sm text-slate-400">
                  <span v-if="session.hostName" class="bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded text-xs">👑 {{ session.hostName }}</span>
                  <span>🕒 截止：{{ session.deadline ? new Date(session.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '無' }}</span>
                  <button 
                    @click="openEditDeadline(session)"
                    class="ml-2 p-1 text-slate-500 hover:text-blue-400 transition-colors"
                    title="修改時間"
                  >
                    ✏️
                  </button>
                  <span v-if="session.deadline && new Date() > new Date(session.deadline)" class="text-red-400 font-bold ml-2">(已截止)</span>
                </div>
              </div>
              <div class="bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full text-sm font-bold">
                {{ session.orders.length }} 人已點
              </div>
            </div>
          </div>

          <!-- Order Summary -->
          <div class="relative z-10 bg-slate-900/50 rounded-xl p-4 mb-6 max-h-48 overflow-y-auto custom-scrollbar">
            <ul class="space-y-2">
              <li v-for="order in session.orders" :key="order.id" class="flex justify-between text-sm text-slate-300 border-b border-slate-700/50 pb-2 last:border-0 last:pb-0">
                <span>
                  {{ order.name }} - {{ order.item }}
                  <span v-if="order.isSelfPay" class="ml-2 text-xs bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded">自費</span>
                </span>
                <span class="font-mono" :class="order.isSelfPay ? 'text-slate-500 line-through' : ''">${{ order.price }}</span>
              </li>
              <li v-if="session.orders.length === 0" class="text-center text-slate-500 py-4">
                尚無訂單
              </li>
            </ul>
          </div>

          <!-- Footer / Actions -->
          <div class="relative z-10 flex items-center justify-between pt-4 border-t border-slate-700">
            <div class="text-xl font-bold text-green-400 flex flex-col items-start">
              <div>
                <span class="text-xs text-slate-500 font-normal mr-1">總計</span>
                ${{ calculateTotal(session.orders) }}
              </div>
              <div v-if="calculateSelfPayTotal(session.orders) > 0" class="text-xs text-slate-400 font-normal">
                (公費 ${{ calculatePublicTotal(session.orders) }})
              </div>
            </div>
            
            <div class="flex gap-2">
               <button 
                @click="handleExport(session)"
                class="px-3 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg font-bold text-sm transition-colors flex items-center gap-1 shadow-md"
                title="匯出 Excel"
              >
                <span>📊</span> 匯出
              </button>
              <button 
                @click="copyGroupBuyText(session)"
                class="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-sm transition-colors flex items-center gap-1 shadow-md"
                title="複製開團文案"
              >
                <span>📋</span> 複製
              </button>
              <button 
                @click="handleCheckout(session)"
                class="px-3 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-bold text-sm transition-colors flex items-center gap-1 shadow-md border border-green-500/50"
                title="結帳"
              >
                <span>💰</span> 結帳
              </button>
              <button 
                @click="handleCancel(session)"
                class="px-3 py-2 bg-red-600/80 hover:bg-red-500 text-white rounded-lg font-bold text-sm transition-colors flex items-center gap-1 shadow-md border border-red-500/50"
                title="取消開團"
              >
                <span>🗑️</span> 取消
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>

    <!-- Modals (Moved outside to ensure visibility) -->
    <!-- Shop Selector Modal -->
    <!-- Shop Selector Modal -->
    <BaseModal :is-open="showShopSelector" max-width="max-w-2xl" custom-class="p-6 max-h-[80vh] overflow-y-auto custom-scrollbar" @close="showShopSelector = false">
      <h3 class="text-2xl font-bold text-white mb-6 text-center">選擇店家</h3>
      
      <!-- Category Tabs for Selector -->
      <div class="flex justify-center mb-6">
        <div class="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
          <button 
            @click="wheelCategory = 'drink'"
            class="px-6 py-2 rounded-lg font-bold transition-all flex items-center gap-2"
            :class="wheelCategory === 'drink' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'"
          >
            <span>🥤</span> 飲料
          </button>
          <button 
            @click="wheelCategory = 'food'"
            class="px-6 py-2 rounded-lg font-bold transition-all flex items-center gap-2"
            :class="wheelCategory === 'food' ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'"
          >
            <span>🍱</span> 食物
          </button>
        </div>
      </div>

      <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
        <button 
          v-for="shop in wheelShops" 
          :key="shop.id"
          @click="selectShop(shop)"
          class="p-4 bg-slate-700 hover:bg-blue-600 rounded-xl text-white font-bold transition-all text-center group flex items-center justify-center min-h-[80px]"
        >
          <div class="text-lg">{{ shop.name }}</div>
        </button>
        
        <div v-if="wheelShops.length === 0" class="col-span-full text-center py-8 text-slate-500">
          此分類尚無店家
        </div>
      </div>
      <button 
        @click="showShopSelector = false"
        class="mt-6 w-full py-3 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl font-bold transition-colors"
      >
        取消
      </button>
    </BaseModal>

    <!-- Edit Deadline Modal -->
    <!-- Edit Deadline Modal -->
    <BaseModal :is-open="showEditDeadlineModal" max-width="max-w-md" custom-class="p-6" @close="showEditDeadlineModal = false">
      <h3 class="text-xl font-bold text-white mb-4 text-center">修改截止時間</h3>
      <div class="mb-6">
        <label class="block text-sm text-slate-400 mb-2">新的截止時間</label>
        <el-date-picker
          v-model="editingDeadline"
          type="datetime"
          placeholder="選擇日期時間"
          format="YYYY-MM-DD HH:mm"
          class="w-full"
          :teleported="false"
        />
      </div>
      <div class="grid grid-cols-2 gap-3">
        <button 
          @click="showEditDeadlineModal = false"
          class="px-4 py-2 rounded-xl bg-slate-700 text-slate-300 hover:bg-slate-600 font-bold transition-colors"
        >
          取消
        </button>
        <button 
          @click="confirmEditDeadline"
          class="px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-500 font-bold shadow-lg shadow-blue-500/25 transition-all"
        >
          確認修改
        </button>
      </div>
    </BaseModal>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
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
