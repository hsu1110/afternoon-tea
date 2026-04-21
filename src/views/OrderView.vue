<script setup>
import { ref, onMounted, computed, inject, watch, nextTick } from 'vue';
import ZoomableImageModal from '../components/ZoomableImageModal.vue';
import OrderForm from '../components/OrderForm.vue';

const triggerToast = inject('triggerToast');
const triggerConfirm = inject('triggerConfirm');

const activeSessions = ref([]);
const selectedSessionId = ref(null);
const menuImage = ref(null);
const members = ref([]);
const selectedMember = ref(null);
const manualName = ref('');
const currentUser = computed(() => selectedMember.value ? selectedMember.value.name : manualName.value);
const currentItem = ref('');
const currentPrice = ref('');
const currentNote = ref('');
const isSelfPay = ref(false);
const isSubmitting = ref(false);
const isMenuModalOpen = ref(false);
const editingOrderId = ref(null);

const selectedSession = computed(() => {
  return activeSessions.value.find(s => s.id === selectedSessionId.value);
});
const timeLeft = computed(() => {
  if (!selectedSession.value || !selectedSession.value.deadline) return '';
  const now = new Date();
  const deadline = new Date(selectedSession.value.deadline);
  const diff = deadline - now;
  
  if (diff <= 0) return '已截止';
 
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  let result = '';
  if (days > 0) {
    result += `${days}天${hours}時`;
  } else if (hours > 0) {
    result += `${hours}時`;
  }
  result += `${minutes}分${seconds}秒`;
  return result;
});

const isLocked = computed(() => {
  return timeLeft.value === '已截止';
});

// 載入資料
const loadData = async () => {
  try {
    const data = await window.electronAPI.getOrders();
    activeSessions.value = Array.isArray(data.activeSessions) ? data.activeSessions : (data.activeSession ? [data.activeSession] : []);
    members.value = await window.electronAPI.getMembers();
    
    // 還原成員選擇（用 id 比對，避免 object reference 不同導致 select 掉回預設值）
    if (selectedMember.value) {
      const refreshed = members.value.find(m => m.id === selectedMember.value.id);
      if (refreshed) {
        selectedMember.value = refreshed;
      }
    } else if (!manualName.value) {
      // 首次載入：嘗試從 localStorage 還原上次使用者
      const lastUserName = localStorage.getItem('lastUser');
      if (lastUserName) {
        const normalizedLastUser = lastUserName.trim();
        const member = members.value.find(m => m.name.trim() === normalizedLastUser);
        if (member) {
          selectedMember.value = member;
        } else {
          manualName.value = lastUserName;
        }
      }
    }
    
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
      
      // 切換店家時，若非編輯狀態，先清空表單，確保能正確載入該店家的紀錄
      if (!editingOrderId.value) {
        currentItem.value = '';
        currentPrice.value = '';
        currentNote.value = '';
        isSelfPay.value = false;
      }

      // 嘗試載入上次點餐紀錄
      if (currentUser.value) {
        quickFillLastOrder();
      }
    }
  }
});

// 快速帶入上次點餐（只在欄位為空時帶入，避免覆蓋使用者已輸入的內容）
const quickFillLastOrder = async () => {
  if (editingOrderId.value) return;
  if (!currentUser.value || !selectedSession.value) return;
  
  // 如果品項或價格已經有值，不覆蓋
  if (currentItem.value || currentPrice.value) return;
  
  try {
    const lastOrder = await window.electronAPI.getLastOrder(currentUser.value, selectedSession.value.shopId);
    if (lastOrder) {
      currentItem.value = lastOrder.item;
      currentPrice.value = lastOrder.price;
      currentNote.value = lastOrder.note || '';
      isSelfPay.value = lastOrder.isSelfPay || false;
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
      note: currentNote.value,
      isSelfPay: isSelfPay.value
    };

    if (editingOrderId.value) {
      // Update existing order
      await window.electronAPI.updateOrder({
        id: editingOrderId.value,
        ...order
      });
      triggerToast('訂單已更新！');
    } else {
      // Create new order
      await window.electronAPI.submitOrder(order);
      triggerToast('點餐成功！');
    }
    
    // Save user preference
    localStorage.setItem('lastUser', currentUser.value);
    
    // Reset form
    cancelEdit();
    
    await loadData();
  } catch (error) {
    console.error('Failed to submit order:', error);
    triggerToast(error.message || '操作失敗');
  } finally {
    isSubmitting.value = false;
  }
};

const editOrder = (order) => {
  editingOrderId.value = order.id;
  currentItem.value = order.item;
  currentPrice.value = order.price;
  currentNote.value = order.note || '';
  isSelfPay.value = order.isSelfPay || false;
  
  // Try to match user
  const member = members.value.find(m => m.name === order.name);
  if (member) {
    selectedMember.value = member;
    manualName.value = '';
  } else {
    selectedMember.value = null;
    manualName.value = order.name;
  }
};

const cancelEdit = () => {
  editingOrderId.value = null;
  currentItem.value = '';
  currentPrice.value = '';
  currentNote.value = '';
  isSelfPay.value = false;
  // Don't reset user, keep current selection
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
      <h2 class="text-2xl font-bold text-white mb-2">目前沒有進行中的訂購</h2>
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
            <div 
              class="aspect-[3/4] bg-slate-900/50 rounded-xl overflow-hidden border border-slate-700 relative group cursor-zoom-in"
              @click="isMenuModalOpen = true"
            >
              <img v-if="menuImage" :src="menuImage" class="w-full h-full object-contain hover:scale-105 transition-transform duration-500" alt="Menu">
              <div v-else class="w-full h-full flex items-center justify-center text-slate-500">
                尚無菜單圖片
              </div>
              
              <!-- Hint overlay -->
              <div v-if="menuImage" class="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                <span class="bg-black/50 text-white px-4 py-2 rounded-full backdrop-blur-sm text-sm font-bold">
                  點擊放大
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Right: Order Form & List -->
        <div class="space-y-6">
          
          <!-- Order Form -->
          <OrderForm
            :members="members"
            v-model:selectedMember="selectedMember"
            v-model:manualName="manualName"
            v-model:item="currentItem"
            v-model:price="currentPrice"
            v-model:note="currentNote"
            v-model:isSelfPay="isSelfPay"
            :is-submitting="isSubmitting"
            :is-locked="isLocked"
            :editing-order-id="editingOrderId"
            @submit="submitOrder"
            @cancel="cancelEdit"
            @quick-fill="quickFillLastOrder"
            class="sticky top-6"
          />

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
                  <div class="font-bold text-white text-sm flex items-center gap-2">
                    {{ order.name }}
                    <span v-if="order.isSelfPay" class="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded border border-yellow-500/30">自費</span>
                  </div>
                  <div class="text-xs text-slate-400">{{ order.item }} <span v-if="order.note" class="text-slate-500">({{ order.note }})</span></div>
                </div>
                <div class="flex items-center gap-2">
                  <span class="font-mono font-bold text-sm mr-2" :class="order.isSelfPay ? 'text-slate-500 line-through' : 'text-green-400'">${{ order.price }}</span>
                  <button 
                    @click="editOrder(order)"
                    :disabled="isLocked"
                    class="p-1.5 bg-blue-600/20 text-blue-400 rounded hover:bg-blue-600 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600/20 disabled:hover:text-blue-400"
                    title="編輯"
                  >
                    ✏️
                  </button>
                  <button 
                    @click="deleteOrder(order.id)"
                    :disabled="isLocked"
                    class="p-1.5 bg-rose-600/20 text-rose-400 rounded hover:bg-rose-600 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-rose-600/20 disabled:hover:text-rose-400"
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
    <!-- Menu Modal -->
    <ZoomableImageModal 
      :is-open="isMenuModalOpen" 
      :image-src="menuImage" 
      @close="isMenuModalOpen = false" 
    >
      <template #sidebar>
        <OrderForm
          :members="members"
          v-model:selectedMember="selectedMember"
          v-model:manualName="manualName"
          v-model:item="currentItem"
          v-model:price="currentPrice"
          v-model:note="currentNote"
          v-model:isSelfPay="isSelfPay"
          :is-submitting="isSubmitting"
          :is-locked="isLocked"
          :editing-order-id="editingOrderId"
          @submit="submitOrder"
          @cancel="cancelEdit"
          @quick-fill="quickFillLastOrder"
        />
      </template>
    </ZoomableImageModal>
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
