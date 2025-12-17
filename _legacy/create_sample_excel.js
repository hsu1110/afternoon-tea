// 此腳本用於建立範例 Excel 檔案
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

function createSampleExcel() {
  // 範例資料
  const sampleData = [
    { '店名': '50嵐', '電話': '02-2345-6789', '網址': 'https://www.50lan.com', '權重': 1 },
    { '店名': '星巴克', '電話': '02-8765-4321', '網址': 'https://www.starbucks.com.tw', '權重': 1 },
    { '店名': 'Coco都可', '電話': '02-1234-5678', '網址': 'https://www.coco-tea.com', '權重': 1 },
    { '店名': '清心福全', '電話': '02-9876-5432', '網址': 'https://www.chingshin.tw', '權重': 1 },
    { '店名': '迷客夏', '電話': '02-3456-7890', '網址': 'https://www.milkshoptea.com', '權重': 1 },
    { '店名': '茶湯會', '電話': '02-5678-9012', '網址': 'https://www.tp-tea.com.tw', '權重': 1 },
    { '店名': '一芳水果茶', '電話': '02-6789-0123', '網址': 'https://www.yifang-tea.com', '權重': 2 },
    { '店名': '鮮茶道', '電話': '02-7890-1234', '網址': 'https://www.presotea.com.tw', '權重': 1 },
    { '店名': '麻古茶坊', '電話': '02-8901-2345', '網址': 'https://www.macu.com.tw', '權重': 1 },
    { '店名': '天仁茗茶', '電話': '02-9012-3456', '網址': 'https://www.tenren.com.tw', '權重': 1 }
  ];

  // 建立工作簿和工作表
  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '下午茶店家');

  // 建立 data 資料夾（如果不存在）
  const dataDir = path.join(__dirname, 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // 儲存檔案
  const filePath = path.join(dataDir, 'afternoon_tea_shops.xlsx');
  XLSX.writeFile(workbook, filePath);

  console.log(`✅ 範例 Excel 檔案已建立: ${filePath}`);
  console.log(`   包含 ${sampleData.length} 家店家`);
}

// 執行
try {
  createSampleExcel();
} catch (err) {
  console.error('❌ 建立檔案時發生錯誤:', err);
  process.exit(1);
}
