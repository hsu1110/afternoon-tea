// ==================== 全域變數 ====================
let wheel;
let currentFilePath = null;

// ==================== 初始化 ====================
window.addEventListener('DOMContentLoaded', async () => {
  // 初始化轉盤
  wheel = new Wheel('wheelCanvas');

  // 載入初始資料
  await loadShopsData();

  // 綁定事件監聽器
  document.getElementById('spinBtn').addEventListener('click', handleSpin);
  document.getElementById('reloadBtn').addEventListener('click', () => loadShopsData());
  document.getElementById('selectFileBtn').addEventListener('click', selectFile);
});

// ==================== 資料載入 ====================
async function loadShopsData(customPath = null) {
  try {
    // 如果沒有指定路徑，則使用當前路徑 (用於重新載入)
    const targetPath = customPath || currentFilePath;
    const result = await window.electronAPI.loadShopsData(targetPath);

    if (!result.success) {
      alert(`載入失敗: ${result.error}`);
      return;
    }

    // 更新當前檔案路徑
    currentFilePath = result.path;
    
    // 更新轉盤資料
    wheel.setData(result.data);
    
    // 更新 UI 資訊
    document.getElementById('totalShops').textContent = result.data.length;
    document.getElementById('filePath').textContent = result.path;
    document.getElementById('filePath').title = result.path;

    // 隱藏結果卡片
    document.getElementById('resultCard').classList.add('hidden');

    console.log('成功載入店家資料:', result.data);
  } catch (error) {
    console.error('載入資料時發生錯誤:', error);
    alert('載入資料時發生錯誤');
  }
}

// ==================== 選擇 Excel 檔案 ====================
async function selectFile() {
  try {
    const result = await window.electronAPI.selectExcelFile();

    if (result.canceled) {
      return;
    }

    if (!result.success) {
      alert(`選擇檔案失敗: ${result.error}`);
      return;
    }

    // 載入選擇的檔案
    await loadShopsData(result.path);
  } catch (error) {
    console.error('選擇檔案時發生錯誤:', error);
    alert('選擇檔案時發生錯誤');
  }
}

// ==================== 抽獎控制 ====================
function handleSpin() {
  if (wheel.isSpinning) return;
  
  if (wheel.shops.length === 0) {
    alert('請先載入店家資料！');
    return;
  }

  // 鎖定按鈕
  const spinBtn = document.getElementById('spinBtn');
  spinBtn.disabled = true;
  document.getElementById('resultCard').classList.add('hidden');

  // 開始旋轉
  wheel.spin((selectedShop) => {
    // 旋轉結束後的回呼
    spinBtn.disabled = false;
    showResult(selectedShop);
  });
}

// ==================== 顯示結果 ====================
function showResult(shop) {
  const resultCard = document.getElementById('resultCard');
  const shopName = document.getElementById('shopName');
  const shopPhone = document.getElementById('shopPhone');
  const shopUrl = document.getElementById('shopUrl');

  shopName.textContent = shop.name;
  shopPhone.textContent = shop.phone || '無';
  
  if (shop.url) {
    shopUrl.href = shop.url;
    shopUrl.textContent = shop.url;
    shopUrl.style.display = 'inline';
  } else {
    shopUrl.style.display = 'none';
    shopUrl.textContent = '無';
  }

  // 顯示結果卡片（帶動畫）
  setTimeout(() => {
    resultCard.classList.remove('hidden');
  }, 100);
}
