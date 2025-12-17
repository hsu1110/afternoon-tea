class Wheel {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.shops = [];
    this.rotation = 0;
    this.isSpinning = false;
    
    // 初始化尺寸
    this.resize();
    
    // 監聽視窗大小改變
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const containerSize = this.canvas.parentElement.offsetWidth;
    this.canvas.width = containerSize * 2;
    this.canvas.height = containerSize * 2;
    this.canvas.style.width = `${containerSize}px`;
    this.canvas.style.height = `${containerSize}px`;
    this.draw();
  }

  setData(shops) {
    this.shops = shops;
    this.draw();
  }

  draw(offsetAngle = this.rotation) {
    if (this.shops.length === 0) {
      this._drawEmpty();
      return;
    }

    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    const radius = this.canvas.width / 2;
    const totalWeight = this.shops.reduce((sum, shop) => sum + shop.weight, 0);

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.save();
    this.ctx.translate(centerX, centerY);

    let currentStartAngle = 0;

    for (let i = 0; i < this.shops.length; i++) {
      const thisSliceAngle = (this.shops[i].weight / totalWeight) * 2 * Math.PI;
      const startAngle = currentStartAngle + offsetAngle;
      const endAngle = startAngle + thisSliceAngle;

      // 繪製扇形
      this.ctx.fillStyle = this._getColor(i);
      this.ctx.beginPath();
      this.ctx.moveTo(0, 0);
      this.ctx.arc(0, 0, radius, startAngle, endAngle);
      this.ctx.closePath();
      this.ctx.fill();

      // 繪製邊框
      this.ctx.strokeStyle = '#ffffff';
      this.ctx.lineWidth = 4;
      this.ctx.stroke();

      // 繪製文字
      this.ctx.save();
      this.ctx.rotate(startAngle + thisSliceAngle / 2);
      this.ctx.textAlign = 'right';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = 'bold 28px Microsoft JhengHei, Arial';
      this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      this.ctx.shadowBlur = 4;
      this.ctx.fillText(this.shops[i].name, radius - 20, 0);
      this.ctx.restore();

      currentStartAngle += thisSliceAngle;
    }

    this.ctx.restore();
    this._drawCenter(centerX, centerY);
  }

  _drawEmpty() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.fillStyle = '#e2e8f0';
    this.ctx.beginPath();
    this.ctx.arc(this.canvas.width / 2, this.canvas.height / 2, this.canvas.width / 2, 0, 2 * Math.PI);
    this.ctx.fill();
    
    this.ctx.fillStyle = '#64748b';
    this.ctx.font = '32px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('請載入資料', this.canvas.width / 2, this.canvas.height / 2);
  }

  _drawCenter(x, y) {
    this.ctx.fillStyle = '#1e293b';
    this.ctx.beginPath();
    this.ctx.arc(x, y, 40, 0, 2 * Math.PI);
    this.ctx.fill();
    this.ctx.strokeStyle = '#f59e0b';
    this.ctx.lineWidth = 6;
    this.ctx.stroke();
  }

  spin(onComplete) {
    if (this.isSpinning || this.shops.length === 0) return;
    this.isSpinning = true;

    const selectedShop = this._getWeightedRandomShop();
    const selectedIndex = this.shops.indexOf(selectedShop);
    const totalWeight = this.shops.reduce((sum, shop) => sum + shop.weight, 0);

    // 計算目標角度
    let targetSliceStartAngle = 0;
    let targetSliceAngle = 0;

    for (let i = 0; i < this.shops.length; i++) {
      const thisSliceAngle = (this.shops[i].weight / totalWeight) * 2 * Math.PI;
      if (i === selectedIndex) {
        targetSliceAngle = thisSliceAngle;
        break;
      }
      targetSliceStartAngle += thisSliceAngle;
    }

    const padding = 0.1;
    const randomRatio = padding + Math.random() * (1 - 2 * padding);
    const targetAngleInSlice = targetSliceStartAngle + targetSliceAngle * randomRatio;

    const pointerAngle = -Math.PI / 2;
    let currentNormalized = this.rotation % (2 * Math.PI);
    if (currentNormalized > 0) currentNormalized -= 2 * Math.PI;

    let targetRotation = pointerAngle - targetAngleInSlice;
    while (targetRotation > 0) targetRotation -= 2 * Math.PI;
    while (targetRotation <= -2 * Math.PI) targetRotation += 2 * Math.PI;

    let diff = targetRotation - currentNormalized;
    if (diff > 0) diff -= 2 * Math.PI;

    const extraSpins = Math.floor(5 + Math.random() * 5);
    const targetOffset = this.rotation + diff - (extraSpins * 2 * Math.PI);

    // 動畫參數
    const duration = 4000;
    const startTime = Date.now();
    const startOffset = this.rotation;

    const animate = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3); // easeOutCubic

      this.rotation = startOffset + (targetOffset - startOffset) * easedProgress;
      this.draw(this.rotation);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        this.rotation = targetOffset;
        this.isSpinning = false;
        if (onComplete) onComplete(selectedShop);
      }
    };

    animate();
  }

  _getWeightedRandomShop() {
    const totalWeight = this.shops.reduce((sum, shop) => sum + shop.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const shop of this.shops) {
      random -= shop.weight;
      if (random <= 0) return shop;
    }
    return this.shops[0];
  }

  _getColor(index) {
    const colors = [
      '#ef4444', '#f59e0b', '#eab308', '#84cc16',
      '#22c55e', '#10b981', '#14b8a6', '#06b6d4',
      '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6',
      '#a855f7', '#d946ef', '#ec4899', '#f43f5e'
    ];
    return colors[index % colors.length];
  }
}
