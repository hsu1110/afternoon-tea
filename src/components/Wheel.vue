<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue';

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
let idleAnimFrame = null;

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

  // 陰影重置
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;

  if (props.shops.length === 0) {
    // 繪製空轉盤
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius - 20, 0, 2 * Math.PI);
    ctx.fill();
    
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 24px "Microsoft JhengHei", Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('請先新增店家資料', centerX, centerY);
    return;
  }

  const totalWeight = props.shops.reduce((sum, shop) => sum + (shop.weight || 1), 0);
  let currentStartAngle = 0;

  ctx.save();
  ctx.translate(centerX, centerY);

  // 1. 繪製各個扇形區塊（稍微透明，讓顏色更柔和）
  ctx.globalAlpha = 0.90;
  props.shops.forEach((shop, i) => {
    const weight = shop.weight || 1;
    const sliceAngle = (weight / totalWeight) * 2 * Math.PI;
    const startAngle = currentStartAngle + offsetAngle;
    const endAngle = startAngle + sliceAngle;

    // 創建扇形漸層（全部不透明，消除黑色中心問題）
    const angleCenter = startAngle + sliceAngle / 2;
    const grad = ctx.createLinearGradient(0, 0, (radius - 20) * Math.cos(angleCenter), (radius - 20) * Math.sin(angleCenter));
    grad.addColorStop(0, '#ffffff');    // 白色中心（遮住 canvas 黑底）
    grad.addColorStop(0.25, getColor(i)); // 快速過渡到原色
    grad.addColorStop(1, getColor(i));  // 邊緣維持原色

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius - 20, startAngle, endAngle);
    ctx.closePath();
    ctx.fill();

    // 扇形分隔線
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo((radius - 20) * Math.cos(startAngle), (radius - 20) * Math.sin(startAngle));
    ctx.stroke();

    // 2. 繪製扇形文字
    ctx.save();
    ctx.rotate(angleCenter);
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px "Outfit", "Inter", "Microsoft JhengHei", sans-serif';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
    ctx.shadowBlur = 6;
    
    // 如果文字太長，截斷它
    let text = shop.name;
    if (text.length > 6) {
      text = text.substring(0, 5) + '...';
    }
    ctx.fillText(text, radius - 45, 0);
    ctx.restore();

    currentStartAngle += sliceAngle;
  });
  ctx.globalAlpha = 1; // 重設透明度，確保後續元素不受影響

  // 3. 繪製精緻的深色外圈邊框 (Bezel)
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 20;
  ctx.beginPath();
  ctx.arc(0, 0, radius - 10, 0, 2 * Math.PI);
  ctx.stroke();

  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, radius - 20, 0, 2 * Math.PI);
  ctx.stroke();

  // 4. 繪製動態旋轉與閃爍的 LED 燈泡
  const blinkPhase = Math.floor(Date.now() / 200) % 2;
  const numDots = 24;
  for (let d = 0; d < numDots; d++) {
    // 當旋轉時，燈泡會跟著微微反向轉動；閒置時則緩慢自轉，極具靈動感
    const angleOffset = isSpinning.value ? offsetAngle * 0.15 : Date.now() * 0.0003;
    const dotAngle = (d / numDots) * 2 * Math.PI + angleOffset;
    const dotX = (radius - 10) * Math.cos(dotAngle);
    const dotY = (radius - 10) * Math.sin(dotAngle);
    
    const isLit = (d + blinkPhase) % 2 === 0;
    
    ctx.save();
    ctx.beginPath();
    ctx.arc(dotX, dotY, 3.5, 0, 2 * Math.PI);
    
    if (isLit) {
      ctx.shadowColor = '#fbbf24';
      ctx.shadowBlur = 8;
      ctx.fillStyle = '#fffbeb'; // 發光白黃色
    } else {
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#475569'; // 暗灰色
    }
    
    ctx.fill();
    ctx.restore();
  }

  // 5. 繪製中心圓盤（實心漸層，對應 GO 按鈕底色，遮蔽扇形頂點）
  ctx.shadowBlur = 0;
  const centerGrad = ctx.createRadialGradient(0, -8, 0, 0, 0, 44);
  centerGrad.addColorStop(0, '#fbbf24'); // 亮黃色中心
  centerGrad.addColorStop(0.5, '#f59e0b'); // 琥珀黃
  centerGrad.addColorStop(1, '#ea580c'); // 暖橘邊緣
  ctx.fillStyle = centerGrad;
  ctx.beginPath();
  ctx.arc(0, 0, 44, 0, 2 * Math.PI);
  ctx.fill();

  ctx.restore();
};

const spin = () => {
  if (isSpinning.value || props.shops.length === 0) return;
  
  // 停止閒置動畫
  if (idleAnimFrame) {
    cancelAnimationFrame(idleAnimFrame);
    idleAnimFrame = null;
  }
  
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

  // 2. 計算旋轉結束時對準指針的角度 (頂部為 -Math.PI / 2)
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

  const padding = 0.15;
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

  const extraSpins = Math.floor(5 + Math.random() * 4);
  const targetOffset = currentRotation + diff - (extraSpins * 2 * Math.PI);

  // 3. 執行平滑減速旋轉動畫
  const duration = 4500;
  const startTime = Date.now();
  const startOffset = currentRotation;

  const animate = () => {
    const now = Date.now();
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // 超平滑緩動曲線
    const easedProgress = 1 - Math.pow(1 - progress, 4);

    currentRotation = startOffset + (targetOffset - startOffset) * easedProgress;
    drawWheel(currentRotation);

    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      currentRotation = targetOffset;
      isSpinning.value = false;
      emit('spin-end', selectedShop);
      // 重新開啟閒置動畫
      startIdleAnimationLoop();
    }
  };

  animate();
};

// 閒置時的點綴燈泡閃爍循環
const startIdleAnimationLoop = () => {
  if (isSpinning.value) return;
  drawWheel();
  idleAnimFrame = requestAnimationFrame(startIdleAnimationLoop);
};

// 暴露給父組件
defineExpose({ spin, isSpinning });

onMounted(() => {
  if (canvasRef.value) {
    ctx = canvasRef.value.getContext('2d');
    
    // 設定高解析度 Canvas 防止模糊
    const size = 400; // 重構後的基礎尺寸
    canvasRef.value.width = size * 2;
    canvasRef.value.height = size * 2;
    canvasRef.value.style.width = '100%';
    canvasRef.value.style.height = '100%';
    
    startIdleAnimationLoop();
  }
});

onUnmounted(() => {
  if (idleAnimFrame) {
    cancelAnimationFrame(idleAnimFrame);
  }
});

watch(() => props.shops, () => {
  drawWheel();
}, { deep: true });

</script>

<template>
  <div class="relative w-full max-w-[400px] aspect-square mx-auto select-none">
    
    <!-- 針指針 (Sleek Needle with Metallic Glow) -->
    <div class="absolute -top-6 left-1/2 -translate-x-1/2 z-20 pointer-events-none drop-shadow-[0_4px_10px_rgba(245,158,11,0.5)]">
      <svg width="36" height="48" viewBox="0 0 36 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M18 48L36 12C36 5.37258 30.6274 0 24 0H12C5.37258 0 0 5.37258 0 12L18 48Z" fill="url(#needleGrad)"/>
        <path d="M18 40L30 14C30 9.58172 26.4183 6 22 6H14C9.58172 6 6 9.58172 6 14L18 40Z" fill="url(#needleInnerGrad)" opacity="0.85"/>
        <defs>
          <linearGradient id="needleGrad" x1="18" y1="0" x2="18" y2="48" gradientUnits="userSpaceOnUse">
            <stop offset="0" stop-color="#fbbf24"/>
            <stop offset="1" stop-color="#ea580c"/>
          </linearGradient>
          <linearGradient id="needleInnerGrad" x1="18" y1="6" x2="18" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0" stop-color="#ffffff"/>
            <stop offset="1" stop-color="#fbbf24" stop-opacity="0.1"/>
          </linearGradient>
        </defs>
      </svg>
    </div>
    
    <!-- Canvas -->
    <canvas 
      ref="canvasRef" 
      class="w-full h-full rounded-full shadow-[0_0_50px_rgba(0,0,0,0.5)] bg-transparent transition-transform duration-100"
    ></canvas>
  </div>
</template>
