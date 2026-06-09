<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';

const props = defineProps({
  isOpen: {
    type: Boolean,
    required: true
  },
  imageSrc: {
    type: String,
    default: null
  }
});

const emit = defineEmits(['close']);

const imageContainer = ref(null);
const imageRef = ref(null);
const zoomLevel = ref(1);
const baseDimensions = ref({ width: 0, height: 0 });
const isDragging = ref(false);
const hasDragged = ref(false);
const startPos = { x: 0, y: 0 };
const scrollPos = { x: 0, y: 0 };
const isZoomed = ref(false);

watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    zoomLevel.value = 1;
    isZoomed.value = false;
  }
});

const imageStyle = computed(() => {
  if (zoomLevel.value <= 1) return {};
  return {
    width: `${baseDimensions.value.width * zoomLevel.value}px`,
    height: `${baseDimensions.value.height * zoomLevel.value}px`,
    maxWidth: 'none',
    maxHeight: 'none'
  };
});

const onWheel = async (e) => {
  if (!imageContainer.value || !imageRef.value) return;
  e.preventDefault();

  const container = imageContainer.value;
  const rect = imageRef.value.getBoundingClientRect();
  
  // If starting from default state, capture base dimensions
  if (zoomLevel.value === 1) {
    baseDimensions.value = {
      width: rect.width,
      height: rect.height
    };
  }

  // Calculate mouse position relative to image (0-1)
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;
  const ratioX = mouseX / rect.width;
  const ratioY = mouseY / rect.height;

  // Calculate new zoom level
  const delta = -Math.sign(e.deltaY) * 0.2;
  const newZoom = Math.max(1, Math.min(5, zoomLevel.value + delta));
  
  if (newZoom === zoomLevel.value) return;

  const oldWidth = baseDimensions.value.width * zoomLevel.value;
  const newWidth = baseDimensions.value.width * newZoom;
  
  const oldHeight = baseDimensions.value.height * zoomLevel.value;
  const newHeight = baseDimensions.value.height * newZoom;

  const scrollAdjustX = (newWidth - oldWidth) * ratioX;
  const scrollAdjustY = (newHeight - oldHeight) * ratioY;

  zoomLevel.value = newZoom;
  isZoomed.value = newZoom > 1;

  await nextTick();
  container.scrollLeft += scrollAdjustX;
  container.scrollTop += scrollAdjustY;
};

const onMouseDown = (e) => {
  if (zoomLevel.value <= 1) return;
  isDragging.value = true;
  hasDragged.value = false;
  startPos.x = e.clientX;
  startPos.y = e.clientY;
  if (imageContainer.value) {
    scrollPos.x = imageContainer.value.scrollLeft;
    scrollPos.y = imageContainer.value.scrollTop;
  }
};

const onMouseMove = (e) => {
  if (!isDragging.value || zoomLevel.value <= 1) return;
  e.preventDefault();
  const dx = e.clientX - startPos.x;
  const dy = e.clientY - startPos.y;
  
  if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
    hasDragged.value = true;
  }

  if (imageContainer.value) {
    imageContainer.value.scrollLeft = scrollPos.x - dx;
    imageContainer.value.scrollTop = scrollPos.y - dy;
  }
};

const onMouseUp = () => {
  isDragging.value = false;
};

const handleImageClick = async (e) => {
  if (hasDragged.value) {
    hasDragged.value = false;
    return;
  }

  if (zoomLevel.value > 1) {
    // Reset
    zoomLevel.value = 1;
    isZoomed.value = false;
  } else {
    // Zoom in
    if (!imageRef.value || !imageContainer.value) return;
    
    // Capture base dimensions
    const rect = imageRef.value.getBoundingClientRect();
    baseDimensions.value = {
      width: rect.width,
      height: rect.height
    };

    const targetZoom = 2.5;
    
    // Calculate click position ratio
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    const xPercent = offsetX / rect.width;
    const yPercent = offsetY / rect.height;

    zoomLevel.value = targetZoom;
    isZoomed.value = true;

    await nextTick();
    const container = imageContainer.value;
    // Center the clicked point
    container.scrollLeft = (baseDimensions.value.width * targetZoom * xPercent) - (container.clientWidth / 2);
    container.scrollTop = (baseDimensions.value.height * targetZoom * yPercent) - (container.clientHeight / 2);
  }
};

const close = () => {
  emit('close');
};

let modalId = null;

const register = () => {
  if (props.isOpen && !modalId) {
    modalId = window.registerModal(() => close());
  }
};

const unregister = () => {
  if (modalId) {
    window.unregisterModal(modalId);
    modalId = null;
  }
};

watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    register();
  } else {
    unregister();
  }
}, { immediate: true });

onUnmounted(() => {
  unregister();
});
</script>

<template>
  <Teleport to="body">
    <div v-if="isOpen" class="modal-overlay" @click.self="close">
      <!-- Image Area -->
      <div class="image-wrapper" @click.self="close">
        <div 
          ref="imageContainer"
          class="image-container"
          :class="{'cursor-grab': zoomLevel > 1 && !isDragging, 'cursor-grabbing': zoomLevel > 1 && isDragging}"
          @mousedown="onMouseDown"
          @mousemove="onMouseMove"
          @mouseup="onMouseUp"
          @mouseleave="onMouseUp"
          @wheel="onWheel"
          @click.self="close"
        >
          <img 
            ref="imageRef"
            :src="imageSrc" 
            class="zoomable-image"
            :class="zoomLevel > 1 ? 'cursor-zoom-out' : 'max-w-full max-h-full object-contain cursor-zoom-in'"
            :style="imageStyle"
            alt="Menu Full Size"
            @click.stop="handleImageClick"
            @dragstart.prevent
          >
        </div>

        <button 
          @click="close"
          class="close-btn"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Sidebar Area -->
      <div v-if="$slots.sidebar" class="sidebar-panel" @click.stop>
        <slot name="sidebar"></slot>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  @apply fixed inset-0 z-[9999] bg-black/90 backdrop-blur-sm flex;
}

.image-wrapper {
  @apply relative flex-1 h-full overflow-hidden;
}

.image-container {
  @apply relative w-full h-full overflow-auto select-none flex;
}

.zoomable-image {
  @apply transition-transform duration-100 shadow-2xl rounded-lg m-auto flex-shrink-0;
}

.close-btn {
  @apply absolute top-4 right-4 text-white bg-black/50 hover:bg-black/70 rounded-full p-2 transition-all z-[100] backdrop-blur-sm border border-white/10 shadow-lg;
}

.sidebar-panel {
  @apply w-[400px] bg-slate-900 border-l border-slate-700 h-full overflow-y-auto p-6 shadow-2xl z-40;
}
</style>
