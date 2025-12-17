<script setup>
import { ref, onMounted, watch } from 'vue';

const props = defineProps({
  shops: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['spin-end']);

const canvasRef = ref(null);
const isSpinning = ref(false);
let ctx = null;
let currentRotation = 0;

// 顏色列表
const colors = [
  '#ef4444', '#f59e0b', '#eab308', '#84cc16',
  '#22c55e', '#10b981', '#14b8a6', '#06b6d4',
  '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6',
  '#a855f7', '#d946ef', '#ec4899', '#f43f5e'
];

const getColor = (index) => colors[index % colors.length];

const drawWheel = (offsetAngle = currentRotation) => {
  if (!canvasRef.value) return;
  
  const canvas = canvasRef.value;
  const width = canvas.width;
  const height = canvas.height;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = width / 2;

  ctx.clearRect(0, 0, width, height);

  if (props.shops.length === 0) {
    // 繪製空轉盤
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.fill();
    
    ctx.fillStyle = '#64748b';
    ctx.font = '32px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('請載入資料', centerX, centerY);
    return;
  }

  const totalWeight = props.shops.reduce((sum, shop) => sum + (shop.weight || 1), 0);
  let currentStartAngle = 0;

  ctx.save();
  ctx.translate(centerX, centerY);

  props.shops.forEach((shop, i) => {
    const weight = shop.weight || 1;
    const sliceAngle = (weight / totalWeight) * 2 * Math.PI;
    const startAngle = currentStartAngle + offsetAngle;
    const endAngle = startAngle + sliceAngle;

    // 扇形
    ctx.fillStyle = getColor(i);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius, startAngle, endAngle);
    ctx.closePath();
    ctx.fill();

    // 邊框
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.stroke();

    // 文字
    ctx.save();
    ctx.rotate(startAngle + sliceAngle / 2);
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px "Microsoft JhengHei", Arial';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 4;
    ctx.fillText(shop.name, radius - 20, 0);
    ctx.restore();

    currentStartAngle += sliceAngle;
  });

  ctx.restore();

  // 中心圓
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.arc(centerX, centerY, 40, 0, 2 * Math.PI);
  ctx.fill();
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 6;
  ctx.stroke();
};

const spin = () => {
  if (isSpinning.value || props.shops.length === 0) return;
  isSpinning.value = true;

  // 1. 權重隨機選擇
  const totalWeight = props.shops.reduce((sum, shop) => sum + (shop.weight || 1), 0);
  let random = Math.random() * totalWeight;
  let selectedShop = props.shops[0];
  let selectedIndex = 0;

  for (let i = 0; i < props.shops.length; i++) {
    random -= (props.shops[i].weight || 1);
    if (random <= 0) {
      selectedShop = props.shops[i];
      selectedIndex = i;
      break;
    }
  }

  // 2. 計算角度
  let targetSliceStartAngle = 0;
  let targetSliceAngle = 0;

  for (let i = 0; i < props.shops.length; i++) {
    const weight = props.shops[i].weight || 1;
    const sliceAngle = (weight / totalWeight) * 2 * Math.PI;
    if (i === selectedIndex) {
      targetSliceAngle = sliceAngle;
      break;
    }
    targetSliceStartAngle += sliceAngle;
  }

  const padding = 0.1;
  const randomRatio = padding + Math.random() * (1 - 2 * padding);
  const targetAngleInSlice = targetSliceStartAngle + targetSliceAngle * randomRatio;

  const pointerAngle = -Math.PI / 2;
  let currentNormalized = currentRotation % (2 * Math.PI);
  if (currentNormalized > 0) currentNormalized -= 2 * Math.PI;

  let targetRotation = pointerAngle - targetAngleInSlice;
  while (targetRotation > 0) targetRotation -= 2 * Math.PI;
  while (targetRotation <= -2 * Math.PI) targetRotation += 2 * Math.PI;

  let diff = targetRotation - currentNormalized;
  if (diff > 0) diff -= 2 * Math.PI;

  const extraSpins = Math.floor(5 + Math.random() * 5);
  const targetOffset = currentRotation + diff - (extraSpins * 2 * Math.PI);

  // 3. 動畫
  const duration = 4000;
  const startTime = Date.now();
  const startOffset = currentRotation;

  const animate = () => {
    const now = Date.now();
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easedProgress = 1 - Math.pow(1 - progress, 3);

    currentRotation = startOffset + (targetOffset - startOffset) * easedProgress;
    drawWheel(currentRotation);

    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      currentRotation = targetOffset;
      isSpinning.value = false;
      emit('spin-end', selectedShop);
    }
  };

  animate();
};

// 暴露 spin 方法給父組件
defineExpose({ spin, isSpinning });

onMounted(() => {
  if (canvasRef.value) {
    ctx = canvasRef.value.getContext('2d');
    // 設定高解析度
    const size = 450; // 基礎尺寸
    canvasRef.value.width = size * 2;
    canvasRef.value.height = size * 2;
    canvasRef.value.style.width = '100%';
    canvasRef.value.style.height = '100%';
    drawWheel();
  }
});

watch(() => props.shops, () => {
  drawWheel();
}, { deep: true });

</script>

<template>
  <div class="relative w-full max-w-[450px] aspect-square mx-auto">
    <!-- 指針 -->
    <div class="absolute -top-5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[20px] border-l-transparent border-r-[20px] border-r-transparent border-t-[40px] border-t-amber-500 drop-shadow-lg z-10"></div>
    
    <!-- Canvas -->
    <canvas 
      ref="canvasRef" 
      class="w-full h-full rounded-full shadow-2xl bg-white transition-transform duration-100"
    ></canvas>
  </div>
</template>
