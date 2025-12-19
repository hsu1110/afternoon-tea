const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const JsonService = require('./jsonService.cjs');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

const fs = require('fs');

let jsonService;

// Config Handling
const getConfigPath = () => path.join(app.getPath('userData'), 'config.json');

const loadConfig = () => {
  try {
    const configPath = getConfigPath();
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
  } catch (error) {
    console.error('Failed to load config:', error);
  }
  return {};
};

const saveConfig = (config) => {
  try {
    fs.writeFileSync(getConfigPath(), JSON.stringify(config, null, 2));
  } catch (error) {
    console.error('Failed to save config:', error);
  }
};

const createWindow = () => {
  // Initialize Data Service
  const config = loadConfig();
  
  // 優先使用設定檔中的路徑
  let dataPath = config.dataDir;
  
  // [First Run Check] 如果沒有設定路徑，且是在正式環境 (Production)，詢問使用者
  if (!dataPath && process.env.NODE_ENV !== 'development') {
    const choice = dialog.showMessageBoxSync({
      type: 'question',
      buttons: ['使用預設路徑', '選擇資料夾 (適用於共用資料)'],
      defaultId: 0,
      title: '初次設定 - 下午茶轉盤',
      message: '歡迎使用！請問您要將資料儲存在哪裡？\n\n🔹 使用預設路徑：適合個人使用，資料存在本機。\n🔹 選擇資料夾：若您需要與同事共用資料，請選擇此項並指向共用的網路磁碟或雲端同步資料夾。',
      cancelId: 0,
      noLink: true
    });

    if (choice === 1) {
      // 使用者選擇自訂資料夾
      const paths = dialog.showOpenDialogSync({
        properties: ['openDirectory', 'createDirectory'],
        title: '選擇資料儲存資料夾',
        buttonLabel: '選擇此資料夾'
      });
      
      if (paths && paths.length > 0) {
        dataPath = paths[0];
      }
    }

    // 如果使用者選了預設，或取消了選擇，就設定為預設路徑
    if (!dataPath) {
      dataPath = path.join(app.getPath('userData'), 'data');
    }

    // 儲存設定，下次就不會再問了
    config.dataDir = dataPath;
    saveConfig(config);
  }
  
  // Fallback (開發模式或防呆)
  if (!dataPath) {
    dataPath = process.env.NODE_ENV === 'development' 
      ? path.join(__dirname, '..', '_data', 'data')
      : path.join(app.getPath('userData'), 'data');
  }
    
  jsonService = new JsonService(dataPath);
  
  if (typeof jsonService.getShops !== 'function') {
    console.error('CRITICAL ERROR: getShops is NOT a function on jsonService instance!');
  }

  jsonService.initSampleData();

  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, '../public/icon2.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // In production, load the index.html of the app.
  // In development, load the local server URL.
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5174');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
};

// IPC Handlers
ipcMain.handle('get-shops', () => {
  return jsonService.getShops();
});

ipcMain.handle('start-session', (event, { shop, deadline }) => {
  return jsonService.startSession(shop, deadline);
});

ipcMain.handle('update-weights', (event, winnerId) => {
  return jsonService.updateShopWeights(winnerId);
});

ipcMain.handle('submit-order', (event, order) => {
  return jsonService.submitOrder(order);
});

ipcMain.handle('delete-order', (event, orderId) => {
  return jsonService.deleteOrder(orderId);
});

ipcMain.handle('update-order', (event, order) => {
  return jsonService.updateOrder(order);
});

ipcMain.handle('get-last-order', (event, { user, shopId }) => {
  return jsonService.getLastOrder(user, shopId);
});

ipcMain.handle('update-session', (event, updates) => {
  return jsonService.updateSession(updates);
});

ipcMain.handle('cancel-session', (event, sessionId) => {
  return jsonService.cancelSession(sessionId);
});

ipcMain.handle('checkout-session', (event, amount, shopName, sessionId) => {
  return jsonService.checkoutSession(amount, shopName, sessionId);
});

ipcMain.handle('get-orders', () => {
  return jsonService.getOrders();
});

ipcMain.handle('get-menu-image', (event, shopId) => {
  return jsonService.getMenuImage(shopId);
});

ipcMain.handle('update-fund-transaction', (event, transaction) => {
  return jsonService.updateFundTransaction(transaction);
});

ipcMain.handle('delete-fund-transaction', (event, id) => {
  return jsonService.deleteFundTransaction(id);
});

ipcMain.handle('get-funds', () => {
  return jsonService.getFunds();
});

ipcMain.handle('add-fund-transaction', (event, transaction) => {
  return jsonService.addFundTransaction(transaction);
});

ipcMain.handle('save-shop', (event, { shop, imagePath }) => {
  return jsonService.saveShop(shop, imagePath);
});

ipcMain.handle('delete-shop', (event, shopId) => {
  return jsonService.deleteShop(shopId);
});

ipcMain.handle('select-image', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'Images', extensions: ['jpg', 'png', 'jpeg', 'webp'] }]
  });
  if (canceled) {
    return null;
  } else {
    return filePaths[0];
  }
});

ipcMain.handle('export-orders', async (event, sessionId) => {
  const result = jsonService.exportOrdersToExcel(sessionId);
  if (!result.success) {
    return result; // 回傳錯誤訊息
  }

  const { canceled, filePath } = await dialog.showSaveDialog({
    title: '匯出訂單',
    defaultPath: result.defaultFilename,
    filters: [{ name: 'Excel Files', extensions: ['xlsx'] }]
  });

  if (canceled || !filePath) {
    return { success: false, message: '已取消' };
  }

  try {
    const fs = require('fs');
    fs.writeFileSync(filePath, result.buffer);
    return { success: true, filePath };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

ipcMain.handle('get-data-path', () => {
  return jsonService.dataDir;
});

ipcMain.handle('set-data-path', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    title: '選擇資料儲存資料夾'
  });

  if (canceled || filePaths.length === 0) {
    return { success: false, message: '已取消' };
  }

  const newPath = filePaths[0];
  
  // Save to config
  const config = loadConfig();
  config.dataDir = newPath;
  saveConfig(config);

  return { success: true, path: newPath, message: '設定已儲存，請重啟應用程式以生效。' };
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers will be added here
