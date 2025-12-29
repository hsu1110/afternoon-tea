<script setup>
import { ref, onMounted, inject } from 'vue';

const members = ref([]);
const isEditing = ref(false);
const editingMember = ref({ id: '', name: '' });
const triggerToast = inject('triggerToast');
const triggerConfirm = inject('triggerConfirm');

const loadMembers = async () => {
  try {
    members.value = await window.electronAPI.getMembers();
  } catch (error) {
    console.error('Failed to load members:', error);
  }
};

const resetForm = () => {
  isEditing.value = false;
  editingMember.value = { id: '', name: '' };
};

const editMember = (member) => {
  isEditing.value = true;
  editingMember.value = { ...member };
};

const saveMember = async () => {
  try {
    const memberData = JSON.parse(JSON.stringify(editingMember.value));
    await window.electronAPI.saveMember(memberData);
    
    triggerToast('儲存成功！');
    resetForm();
    loadMembers();
  } catch (error) {
    console.error('Failed to save member:', error);
    triggerToast('儲存失敗');
  }
};

const deleteMember = async (id) => {
  const confirmed = await triggerConfirm({
    title: '刪除成員',
    message: '確定要刪除這位成員嗎？',
    confirmText: '刪除',
    type: 'danger'
  });
  
  if (!confirmed) return;
  
  try {
    await window.electronAPI.deleteMember(id);
    loadMembers();
    triggerToast('已刪除成員');
  } catch (error) {
    console.error('Failed to delete member:', error);
    triggerToast('刪除失敗');
  }
};

onMounted(() => {
  loadMembers();
});
</script>

<template>
  <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
    <!-- Left: Member List -->
    <div class="lg:col-span-8">
      <div class="bg-slate-800/50 backdrop-blur-md border border-slate-700 rounded-2xl p-6 shadow-xl">
        <h2 class="text-2xl font-bold text-white mb-6 flex items-center gap-2">
          <span>👥</span> 成員列表
        </h2>
        
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <div 
            v-for="member in members" 
            :key="member.id"
            class="bg-slate-700/30 p-4 rounded-xl border border-slate-600/50 hover:border-blue-500/50 transition-all group relative flex flex-col items-center justify-center text-center"
          >
            <div class="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xl mb-3 shadow-lg">
              {{ member.name[0] }}
            </div>
            <h3 class="font-bold text-lg text-white mb-1">{{ member.name }}</h3>
            
            <div class="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                @click="editMember(member)"
                class="p-1.5 bg-blue-600/20 text-blue-400 rounded-lg hover:bg-blue-600 hover:text-white transition-colors"
              >
                ✏️
              </button>
              <button 
                @click="deleteMember(member.id)"
                class="p-1.5 bg-rose-600/20 text-rose-400 rounded-lg hover:bg-rose-600 hover:text-white transition-colors"
              >
                🗑️
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Right: Edit Form -->
    <div class="lg:col-span-4">
      <div class="bg-slate-800/80 backdrop-blur-md border border-slate-600 rounded-2xl p-6 shadow-2xl sticky top-6">
        <h3 class="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <span>🛠️</span> {{ isEditing ? '編輯成員' : '新增成員' }}
        </h3>
        
        <form @submit.prevent="saveMember" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-slate-400 mb-1">姓名</label>
            <input 
              v-model="editingMember.name"
              type="text" 
              required
              class="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
              placeholder="例如：Benson"
            >
          </div>

          <div class="flex gap-3 pt-4">
            <button 
              v-if="isEditing"
              type="button"
              @click="resetForm"
              class="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold transition-colors"
            >
              取消
            </button>
            <button 
              type="submit"
              class="flex-1 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 transform hover:-translate-y-0.5 transition-all duration-200"
            >
              {{ isEditing ? '儲存修改' : '新增成員' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
