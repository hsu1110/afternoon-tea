<script setup>
import { ref, onMounted, inject, computed } from 'vue';
import { 
  Pencil, Download, Copy, Wallet, Trash2, Dices,
  Cake, Clock, Crown, Sparkles, Store, ArrowLeft, Shuffle,
  CupSoda, Pizza, Info
} from 'lucide-vue-next';
import Wheel from '../components/Wheel.vue';
import BaseModal from '../components/BaseModal.vue';
import CustomSelect from '../components/CustomSelect.vue';

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
const teaTime = ref(null);
const selectedHost = ref(null);
const wheelCategory = ref('drink'); // 'drink' or 'food'

// UX Improvements State
const showShopSelector = ref(false);
const showEditModal = ref(false);
const editingSession = ref(null);
const editingTime = ref(null);
const editType = ref('deadline'); // 'deadline' or 'teaTime'

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

  // Default teaTime: +60 mins
  const teaTimeDate = new Date();
  teaTimeDate.setMinutes(teaTimeDate.getMinutes() + 60);
  teaTime.value = teaTimeDate;
  selectedHost.value = null; // Reset host
  
  showResult.value = true;
};

// 確認開團
const confirmSession = async () => {
  if (!selectedShop.value) return;

  try {
    const shopData = JSON.parse(JSON.stringify(selectedShop.value));
    const deadlineISO = deadline.value ? deadline.value.toISOString() : null;
    const teaTimeISO = teaTime.value ? teaTime.value.toISOString() : null;
    const hostData = selectedHost.value ? JSON.parse(JSON.stringify(selectedHost.value)) : null;
    
    const newSession = await window.electronAPI.startSession(shopData, deadlineISO, hostData, teaTimeISO);
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

// 開啟修改時間 Modal
const openEdit = (session, type) => {
  editingSession.value = session;
  editType.value = type;
  
  if (type === 'deadline') {
    editingTime.value = session.deadline ? new Date(session.deadline) : new Date();
  } else {
    editingTime.value = session.teaTime ? new Date(session.teaTime) : new Date();
  }
  
  showEditModal.value = true;
};

// 確認修改時間
const confirmEdit = async () => {
  if (!editingSession.value || !editingTime.value) return;
  
  try {
    const updates = {
      id: editingSession.value.id
    };
    
    if (editType.value === 'deadline') {
      updates.deadline = editingTime.value.toISOString();
    } else {
      updates.teaTime = editingTime.value.toISOString();
    }
    
    await window.electronAPI.updateSession(updates);
    
    await loadData();
    showEditModal.value = false;
    triggerToast('時間已更新');
  } catch (error) {
    console.error('Update time error:', error);
    triggerToast('更新失敗');
  }
};

// 複製訂購連結文字
const copyGroupBuyText = (session) => {
  const deadlineTime = session.deadline ? new Date(session.deadline).toLocaleString([], { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '無';
  const teaTimeText = session.teaTime ? new Date(session.teaTime).toLocaleString([], { month: '2-digit', day: '2-digit' }) : '無';
  const text = `
${teaTimeText}下午茶！🎉
店家：${session.shopName}
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
      <div class="flex justify-between items-end pb-5 border-b border-slate-800/80">
        <div>
          <h1 class="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <Dices class="w-8 h-8 text-indigo-400 fill-indigo-500/10" />
            <span>下午茶點餐</span>
          </h1>
          <p class="text-sm text-slate-400 mt-1.5 flex items-center gap-1.5">
            <span class="inline-block w-2 h-2 rounded-full animate-pulse" :class="activeSessions.length > 0 ? 'bg-emerald-500' : 'bg-slate-500'"></span>
            <span>{{ activeSessions.length > 0 ? `目前有 ${activeSessions.length} 個進行中的開團` : '今天下午茶吃什麼？讓命運之輪來決定吧！' }}</span>
          </p>
        </div>
        <div class="flex gap-3">
          <button 
            v-if="showWheel"
            @click="openShopSelector"
            class="px-5 py-2.5 bg-blue-500/10 border border-blue-500/40 text-blue-300 hover:bg-blue-600 hover:text-white rounded-xl font-bold transition-all transform hover:-translate-y-0.5 shadow-md whitespace-nowrap flex-shrink-0 flex items-center gap-1.5"
          >
            <Store class="w-4 h-4" />
            <span>直接選擇店家</span>
          </button>
          <button 
            v-if="!showWheel"
            @click="showWheel = true"
            class="px-5 py-2.5 bg-blue-500/10 border border-blue-500/40 text-blue-300 hover:bg-blue-600 hover:text-white rounded-xl font-bold transition-all transform hover:-translate-y-0.5 shadow-md whitespace-nowrap flex-shrink-0 flex items-center gap-1.5"
          >
            <Shuffle class="w-4 h-4" />
            <span>決定下午茶</span>
          </button>
          <button 
            v-else
            @click="showWheel = false"
            class="px-5 py-2.5 bg-slate-800/80 border border-slate-650 text-slate-200 hover:text-white hover:bg-slate-700 rounded-xl font-bold transition-all transform hover:-translate-y-0.5 whitespace-nowrap flex-shrink-0 flex items-center gap-1.5 shadow-md"
          >
            <ArrowLeft class="w-4 h-4" />
            <span>返回列表</span>
          </button>
        </div>
      </div>

      <!-- Wheel Section -->
      <div v-if="showWheel" class="transition-all duration-500 ease-in-out relative max-w-5xl mx-auto">
        <div class="grid grid-cols-1 md:grid-cols-12 gap-8 items-center py-4">
          
          <!-- Left Column: Controls -->
          <div class="md:col-span-5 text-center md:text-left space-y-6">
            <div class="space-y-3">
              <!-- Dynamic status badge -->
              <div class="inline-flex items-center px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-xs font-semibold text-indigo-300 shadow-sm shadow-indigo-500/5">
                <span>命運輪盤已就緒</span>
              </div>
              
              <!-- Gradient elegant header -->
              <h2 class="text-4xl font-black tracking-tight leading-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
                今天下午茶<br class="hidden md:block" />吃什麼？
              </h2>
              
              <!-- Candidate badge showing shop counts -->
              <div class="flex items-center justify-center md:justify-start gap-2 text-sm text-slate-400 mt-1">
                <span>讓命運之輪來決定吧！</span>
                <span class="px-2 py-0.5 text-xs bg-slate-800 border border-slate-700/80 rounded-md text-slate-300 font-medium whitespace-nowrap">
                  已載入 {{ wheelShops.length }} 家候選店
                </span>
              </div>
            </div>
            
            <!-- Wheel Category Toggle -->
            <div class="flex justify-center md:justify-start">
              <div class="flex bg-slate-800/80 p-1 rounded-xl border border-slate-700/60 backdrop-blur-sm">
                <button 
                  @click="wheelCategory = 'drink'"
                  class="px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-1.5 text-sm"
                  :class="wheelCategory === 'drink' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/15' : 'text-slate-400 hover:text-white'"
                >
                  <CupSoda class="w-4 h-4" :class="wheelCategory === 'drink' ? 'text-white' : 'text-blue-400'" />
                  <span>飲料轉盤</span>
                </button>
                <button 
                  @click="wheelCategory = 'food'"
                  class="px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-1.5 text-sm"
                  :class="wheelCategory === 'food' ? 'bg-orange-600 text-white shadow-lg shadow-orange-500/15' : 'text-slate-400 hover:text-white'"
                >
                  <Pizza class="w-4 h-4" :class="wheelCategory === 'food' ? 'text-white' : 'text-orange-400'" />
                  <span>食物轉盤</span>
                </button>
              </div>
            </div>

            <!-- Hint card -->
            <div class="hidden md:block bg-slate-800/30 border border-slate-700/30 rounded-2xl p-4 text-xs text-slate-400 space-y-1.5">
              <p class="font-bold text-slate-350 flex items-center gap-1.5">
                <Info class="w-3.5 h-3.5 text-blue-400 fill-blue-500/5" />
                <span>操作指南</span>
              </p>
              <p class="text-slate-450 leading-relaxed">點擊轉盤中央的「GO!」即可開始隨機選店。店家權重越高，佔比面積就越大喔！</p>
            </div>
          </div>
          
          <!-- Right Column: Wheel -->
          <div class="md:col-span-7 relative flex justify-center">
            <div class="absolute inset-0 bg-blue-500/5 blur-[120px] rounded-full pointer-events-none"></div>
            
            <div v-if="wheelShops.length > 0" class="relative w-full max-w-[400px]">
              <Wheel 
                ref="wheelRef" 
                :shops="wheelShops" 
                @spin-end="onSpinEnd" 
              />
              
              <!-- Spin Button -->
              <div class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
                <button 
                  @click="handleSpin"
                  class="w-20 h-20 bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-500 hover:from-yellow-300 hover:via-amber-400 hover:to-orange-400 rounded-full border border-amber-200/50 hover:border-white/70 text-white font-black text-2xl tracking-wider shadow-[0_0_20px_rgba(245,158,11,0.4)] hover:shadow-[0_0_30px_rgba(245,158,11,0.65)] flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-90"
                >
                  <span class="drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]">GO!</span>
                </button>
              </div>
            </div>
            
            <div v-else class="w-full text-center py-12 bg-slate-800/30 rounded-3xl border border-slate-700/40 backdrop-blur-sm max-w-sm">
               <div class="text-5xl mb-3">📭</div>
               <h3 class="text-lg font-bold text-white mb-1.5">這個分類還沒有店家</h3>
               <p class="text-xs text-slate-450">請先到「店家管理」新增店家喔！</p>
            </div>
          </div>

        </div>

        <!-- Result Modal -->
        <BaseModal :is-open="showResult" max-width="max-w-md" custom-class="p-6" @close="showResult = false">
          <div class="text-center space-y-4">
            <!-- Header with bounce crown -->
            <div class="flex flex-col items-center gap-1.5 mt-2">
              <div class="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-2xl shadow-sm shadow-amber-500/5 animate-bounce">
                <Crown class="w-7 h-7 text-amber-400 fill-amber-500/15" />
              </div>
              <h3 class="text-xl font-bold text-slate-200 tracking-tight">命運決定就是這家了！</h3>
            </div>
            
            <!-- Beautiful Winner Banner with text gradient -->
            <div class="py-3 px-4 relative overflow-hidden">
              <div class="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-400 to-orange-400 select-all tracking-wide drop-shadow-[0_2px_8px_rgba(245,158,11,0.15)]">
                {{ selectedShop?.name }}
              </div>
              <div v-if="selectedShop?.phone" class="text-xs text-slate-400 mt-2 flex items-center justify-center gap-1.5">
                <span class="font-mono text-slate-350">📞 {{ selectedShop?.phone }}</span>
              </div>
              <div v-else class="text-xs text-slate-500 mt-2">
                無電話號碼資訊
              </div>
            </div>
            
            <!-- Setup Form inside Translucent Container -->
            <div class="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 text-left space-y-4 shadow-sm">
              <!-- Tea Time Input -->
              <div class="space-y-1.5">
                <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Cake class="w-3.5 h-3.5 text-pink-400 fill-pink-500/10" />
                  <span>預計開吃時間</span>
                </label>
                <el-date-picker
                  v-model="teaTime"
                  type="date"
                  placeholder="選擇日期"
                  format="YYYY-MM-DD"
                  class="w-full"
                  :teleported="false"
                />
              </div>

              <!-- Deadline Input -->
              <div class="space-y-1.5">
                <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock class="w-3.5 h-3.5 text-amber-400 fill-amber-500/10" />
                  <span>截止訂購時間</span>
                </label>
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
              <div class="space-y-1.5">
                <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Crown class="w-3.5 h-3.5 text-yellow-400 fill-yellow-500/10" />
                  <span>主揪負責人</span>
                </label>
                <CustomSelect
                  v-model="selectedHost"
                  :options="members"
                  option-label="name"
                  placeholder="-- 選擇負責人 --"
                />
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="grid grid-cols-2 gap-3 pt-2">
              <button 
                @click="showResult = false"
                class="px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-red-500/10 border border-slate-700/60 hover:border-red-500/30 text-slate-350 hover:text-red-300 font-bold transition-all shadow-md"
              >
                重新選擇
              </button>
              <button 
                @click="confirmSession"
                class="px-4 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-500 font-bold shadow-lg shadow-blue-500/25 transition-all transform hover:-translate-y-0.5"
              >
                確認開訂
              </button>
            </div>
          </div>
        </BaseModal>
      </div>

      <!-- Active Sessions List -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div v-if="activeSessions.length === 0" class="col-span-full text-center py-20 text-slate-500 bg-slate-800/20 rounded-3xl border border-slate-700/50 border-dashed max-w-4xl mx-auto w-full">
          <div class="text-4xl mb-4 animate-pulse">😴</div>
          <p class="text-xl font-bold text-slate-400">目前沒有進行中的訂購</p>
          <p class="text-sm mt-2 text-slate-500">點擊上方按鈕來決定今天要吃什麼吧！</p>
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
                <div class="flex items-center gap-3 mb-2 flex-wrap">
                  <h2 class="text-2xl font-bold text-white">{{ session.shopName }}</h2>
                  <span v-if="session.hostName" class="bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded text-xs whitespace-nowrap flex items-center gap-1">
                    <Crown class="w-3 h-3 text-yellow-400 fill-yellow-500/10" />
                    <span>{{ session.hostName }}</span>
                  </span>
                </div>
                
                <div class="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-400">
                  <div class="flex items-center gap-1">
                    <span class="whitespace-nowrap flex items-center gap-1.5">
                      <Cake class="w-3.5 h-3.5 text-pink-400 fill-pink-500/10" />
                      <span>下午茶：{{ session.teaTime ? new Date(session.teaTime).toLocaleDateString([], { month: '2-digit', day: '2-digit' }) : '無' }}</span>
                    </span>
                    <button 
                      @click="openEdit(session, 'teaTime')"
                      class="ml-1.5 p-1 bg-blue-500/5 border border-blue-500/20 text-blue-400/80 hover:bg-blue-500/15 hover:text-blue-400 hover:border-blue-500/40 rounded-md transition-all flex items-center justify-center"
                      title="修改下午茶時間"
                    >
                      <Pencil class="w-3 h-3" />
                    </button>
                  </div>

                  <div class="flex items-center gap-1 whitespace-nowrap">
                    <span class="flex items-center gap-1.5">
                      <Clock class="w-3.5 h-3.5 text-amber-400 fill-amber-500/10" />
                      <span>截止時間：{{ session.deadline ? new Date(session.deadline).toLocaleTimeString([], { month: '2-digit', day: '2-digit',hour: '2-digit', minute: '2-digit' }) : '無' }}</span>
                    </span>
                    <button 
                      @click="openEdit(session, 'deadline')"
                      class="ml-1.5 p-1 bg-blue-500/5 border border-blue-500/20 text-blue-400/80 hover:bg-blue-500/15 hover:text-blue-400 hover:border-blue-500/40 rounded-md transition-all flex items-center justify-center"
                      title="修改截止時間"
                    >
                      <Pencil class="w-3 h-3" />
                    </button>
                    <span v-if="session.deadline && new Date() > new Date(session.deadline)" class="text-red-400 font-bold ml-2">(已截止)</span>
                  </div>
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
              <li v-for="order in session.orders" :key="order.id" class="border-b border-slate-700/50 pb-2 last:border-0 last:pb-0">
                <div class="flex justify-between text-sm text-slate-300">
                  <span>
                    {{ order.name }} - {{ order.item }}
                    <span v-if="order.isSelfPay" class="ml-2 text-xs bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded">自費</span>
                  </span>
                  <span class="font-mono" :class="order.isSelfPay ? 'text-slate-500 line-through' : ''">${{ order.price }}</span>
                </div>
                <div v-if="order.note" class="text-xs text-slate-500 mt-1 pl-4">
                  ({{ order.note }})
                </div>
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
            
            <div class="flex items-center gap-2">
              <button 
                @click="handleExport(session)"
                class="p-3 bg-slate-700/20 border border-slate-600/40 text-slate-350 hover:bg-slate-700/40 hover:text-white hover:border-slate-500/60 rounded-xl transition-all flex items-center justify-center shadow-md flex-shrink-0"
                title="匯出 Excel"
              >
                <Download class="w-4 h-4" />
              </button>
              <button 
                @click="copyGroupBuyText(session)"
                class="p-3 bg-blue-500/5 border border-blue-500/20 text-blue-400/90 hover:bg-blue-500/15 hover:text-blue-400 hover:border-blue-500/50 rounded-xl transition-all flex items-center justify-center shadow-md flex-shrink-0"
                title="複製開團文案"
              >
                <Copy class="w-4 h-4" />
              </button>
              <button 
                @click="handleCheckout(session)"
                class="p-3 bg-amber-500/5 border border-amber-500/20 text-amber-400/90 hover:bg-amber-500/15 hover:text-amber-400 hover:border-amber-500/50 rounded-xl transition-all flex items-center justify-center shadow-md flex-shrink-0"
                title="結帳"
              >
                <Wallet class="w-4 h-4" />
              </button>
              <button 
                @click="handleCancel(session)"
                class="p-3 bg-red-500/5 border border-red-500/20 text-red-400/90 hover:bg-red-500/15 hover:text-red-400 hover:border-red-500/50 rounded-xl transition-all flex items-center justify-center shadow-md flex-shrink-0"
                title="取消開團"
              >
                <Trash2 class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>

    <!-- Modals (Moved outside to ensure visibility) -->
    <!-- Shop Selector Modal -->
    <BaseModal :is-open="showShopSelector" max-width="max-w-xl" custom-class="p-6 max-h-[80vh] overflow-y-auto custom-scrollbar" @close="showShopSelector = false">
      <h3 class="text-2xl font-bold text-white mb-6 text-center tracking-tight">選擇店家</h3>
      
      <!-- Category Tabs for Selector -->
      <div class="flex justify-center mb-6">
        <div class="flex bg-slate-800/90 p-1 rounded-xl border border-slate-700/60 backdrop-blur-sm">
          <button 
            @click="wheelCategory = 'drink'"
            class="px-6 py-2 rounded-lg font-bold transition-all flex items-center gap-2 text-sm"
            :class="wheelCategory === 'drink' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/15' : 'text-slate-400 hover:text-white'"
          >
            <CupSoda class="w-4 h-4" :class="wheelCategory === 'drink' ? 'text-white' : 'text-blue-400'" />
            <span>飲料</span>
          </button>
          <button 
            @click="wheelCategory = 'food'"
            class="px-6 py-2 rounded-lg font-bold transition-all flex items-center gap-2 text-sm"
            :class="wheelCategory === 'food' ? 'bg-orange-600 text-white shadow-lg shadow-orange-500/15' : 'text-slate-400 hover:text-white'"
          >
            <Pizza class="w-4 h-4" :class="wheelCategory === 'food' ? 'text-white' : 'text-orange-400'" />
            <span>食物</span>
          </button>
        </div>
      </div>

      <!-- Shop Grid -->
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
        <button 
          v-for="shop in wheelShops" 
          :key="shop.id"
          @click="selectShop(shop)"
          class="p-4 bg-slate-800/50 hover:bg-blue-500/10 border border-slate-700/60 hover:border-blue-500/50 text-slate-200 hover:text-blue-300 rounded-xl font-bold transition-all text-center flex items-center justify-center min-h-[68px] shadow-sm group relative overflow-hidden"
        >
          <div class="text-base tracking-wide relative z-10 group-hover:scale-105 transition-transform duration-200">{{ shop.name }}</div>
          <!-- Subtle hover background glow -->
          <div class="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
        </button>
        
        <div v-if="wheelShops.length === 0" class="col-span-full text-center py-12 text-slate-500 font-medium">
          此分類尚無店家
        </div>
      </div>
      
      <button 
        @click="showShopSelector = false"
        class="mt-6 w-full py-3 bg-slate-800/80 hover:bg-red-500/10 border border-slate-700/60 hover:border-red-500/30 text-slate-350 hover:text-red-300 rounded-xl font-bold transition-all shadow-md flex items-center justify-center gap-1.5"
      >
        <span>取消</span>
      </button>
    </BaseModal>

    <!-- Edit Time Modal -->
    <BaseModal :is-open="showEditModal" max-width="max-w-md" custom-class="p-6" @close="showEditModal = false">
      <div class="flex items-center justify-center gap-2 mb-4">
        <component 
          :is="editType === 'deadline' ? Clock : Cake" 
          class="w-5 h-5"
          :class="editType === 'deadline' ? 'text-amber-400 fill-amber-500/10' : 'text-pink-400 fill-pink-500/10'"
        />
        <h3 class="text-xl font-bold text-white tracking-tight">
          {{ editType === 'deadline' ? '修改截止時間' : '修改下午茶時間' }}
        </h3>
      </div>
      
      <div class="mb-6 space-y-2">
        <label class="block text-sm font-semibold text-slate-300">
          {{ editType === 'deadline' ? '新的截止時間' : '新的下午茶時間' }}
        </label>
        <el-date-picker
          v-model="editingTime"
          :type="editType === 'deadline' ? 'datetime' : 'date'"
          placeholder="選擇日期時間"
          :format="editType === 'deadline' ? 'YYYY-MM-DD HH:mm' : 'YYYY-MM-DD'"
          class="w-full"
          :teleported="false"
        />
      </div>
      
      <div class="grid grid-cols-2 gap-3">
        <button 
          @click="showEditModal = false"
          class="px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-705 border border-slate-700/60 text-slate-350 hover:text-white font-bold transition-all shadow-md"
        >
          取消
        </button>
        <button 
          @click="confirmEdit"
          class="px-4 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-500 font-bold shadow-lg shadow-blue-500/25 transition-all transform hover:-translate-y-0.5"
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
