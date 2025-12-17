const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');

let mainWindow;

// 建立主視窗
function createWindow() {
  // 讀取設定檔
  let config = {
    windowWidth: 1000,
    windowHeight: 800,
    excelPath: './data/afternoon_tea_shops.xlsx'
  };

  try {
    const configPath = path.join(__dirname, 'config.json');
    if (fs.existsSync(configPath)) {
      const configData = fs.readFileSync(configPath, 'utf-8');
      config = { ...config, ...JSON.parse(configData) };
    }
  } catch (error) {
    console.log('使用預設設定:', error.message);
  }

  mainWindow = new BrowserWindow({
    width: config.windowWidth,
    height: config.windowHeight,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    title: '下午茶轉盤',
    icon: path.join(__dirname, 'assets/icon.png')
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  // 開發模式下開啟 DevTools
  // mainWindow.webContents.openDevTools();
}

// 應用程式準備好時建立視窗
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// 所有視窗關閉時退出應用程式（macOS 除外）
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC 處理：載入店家資料
ipcMain.handle('load-shops-data', async (event, customPath) => {
  try {
    let excelPath;
    
    if (customPath) {
      excelPath = customPath;
    } else {
      // 從設定檔讀取路徑
      const configPath = path.join(__dirname, 'config.json');
      if (fs.existsSync(configPath)) {
        const configData = fs.readFileSync(configPath, 'utf-8');
        const config = JSON.parse(configData);
        excelPath = path.resolve(__dirname, config.excelPath);
      } else {
        excelPath = path.join(__dirname, 'data', 'afternoon_tea_shops.xlsx');
      }
    }

    // 檢查檔案是否存在
    if (!fs.existsSync(excelPath)) {
      throw new Error(`找不到 Excel 檔案: ${excelPath}`);
    }

    // 讀取 Excel 檔案
    const workbook = XLSX.readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // 轉換為 JSON，自動使用第一列作為 key
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

    // 驗證資料格式
    if (jsonData.length === 0) {
      throw new Error('Excel 檔案中沒有資料');
    }

    // 整理資料格式（支援中英文欄位名稱）
    const shops = jsonData.map(row => {
      return {
        name: row['店名'] || row['Name'] || row['name'] || '未命名',
        phone: row['電話'] || row['Phone'] || row['phone'] || '',
        url: row['網址'] || row['URL'] || row['url'] || '',
        weight: parseInt(row['權重'] || row['Weight'] || row['weight'] || 1)
      };
    });

    return {
      success: true,
      data: shops,
      path: excelPath
    };

  } catch (error) {
    console.error('載入 Excel 失敗:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

// IPC 處理：選擇 Excel 檔案
ipcMain.handle('select-excel-file', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: '選擇下午茶店家 Excel 檔案',
      filters: [
        { name: 'Excel 檔案', extensions: ['xlsx', 'xls'] }
      ],
      properties: ['openFile']
    });

    if (result.canceled) {
      return { success: false, canceled: true };
    }

    return { success: true, path: result.filePaths[0] };

  } catch (error) {
    console.error('選擇檔案失敗:', error);
    return {
      success: false,
      error: error.message
    };
  }
});
