const { app, BrowserWindow, ipcMain, dialog, Tray, Menu, nativeImage, Notification } = require('electron');
const path = require('path');
const JsonService = require('./jsonService.cjs');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

const fs = require('fs');

let jsonService;
let mainWindow;
let tray;
let isQuitting = false;

// Single Instance Lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, we should focus our window.
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      if (!mainWindow.isVisible()) mainWindow.show();
      mainWindow.focus();
    }
  });
}

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

const getIconPath = () => {
  if (process.env.NODE_ENV === 'development') {
    return path.join(__dirname, '../public/icon.png');
  }
  return path.join(__dirname, '../dist/icon.png');
};

const createTray = () => {
  const iconPath = getIconPath();
  const trayIcon = nativeImage.createFromPath(iconPath);
  tray = new Tray(trayIcon.resize({ width: 16, height: 16 }));
  tray.setToolTip('下午茶轉盤');

  const contextMenu = Menu.buildFromTemplate([
    { 
      label: '顯示主視窗', 
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      } 
    },
    { 
      label: '結束程式', 
      click: () => {
        isQuitting = true;
        app.quit();
      } 
    }
  ]);

  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });
};



// Set App User Model ID for Windows Notifications
app.setAppUserModelId('Afternoon Tea');

// 通知狀態存本機 config（不寫回共用的 orders.json，避免 A 通知後 B 收不到）
const getNotifiedSessions = () => {
  const config = loadConfig();
  return config.notifiedSessions || {};
};

const markNotified = (sessionId, stage) => {
  const config = loadConfig();
  if (!config.notifiedSessions) config.notifiedSessions = {};
  if (!config.notifiedSessions[sessionId]) config.notifiedSessions[sessionId] = [];
  if (!config.notifiedSessions[sessionId].includes(stage)) {
    config.notifiedSessions[sessionId].push(stage);
  }
  saveConfig(config);
};

// 提醒階段（分鐘）
const REMINDER_STAGES = [
  { minutes: 60, label: '還有 1 小時', urgent: false },
  { minutes: 10, label: '剩 10 分鐘！', urgent: true },
];

// 顯示提醒小視窗（獨立 BrowserWindow，alwaysOnTop，app 藏在 tray 也看得到）
let reminderWindow = null;
let reminderWindowTimer = null;
const showReminderWindow = (shopName, label, urgent) => {
  // 如果已經有一個提醒視窗就先關掉
  if (reminderWindow && !reminderWindow.isDestroyed()) {
    reminderWindow.close();
  }
  if (reminderWindowTimer) {
    clearTimeout(reminderWindowTimer);
    reminderWindowTimer = null;
  }

  const { screen } = require('electron');
  const display = screen.getPrimaryDisplay();
  const { width, height } = display.workAreaSize;

  const winWidth = 340;
  const winHeight = 120;

  reminderWindow = new BrowserWindow({
    width: winWidth,
    height: winHeight,
    x: width - winWidth - 20,
    y: height - winHeight - 20,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    transparent: true,
    focusable: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const bgColor = urgent ? '#92400e' : '#1e3a5f';
  const borderColor = urgent ? '#f97316' : '#3b82f6';
  const emoji = urgent ? '🔥' : '🍵';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Segoe UI', 'Microsoft JhengHei', sans-serif;
          background: transparent;
          -webkit-app-region: drag;
          cursor: pointer;
        }
        .card {
          background: linear-gradient(135deg, ${bgColor}, #0f172a);
          border: 2px solid ${borderColor};
          border-radius: 16px;
          padding: 20px 24px;
          color: white;
          height: 100vh;
          display: flex;
          align-items: center;
          gap: 14px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.5);
          ${urgent ? `animation: pulse 2s infinite;` : ''}
        }
        .emoji { font-size: 32px; flex-shrink: 0; }
        .content { flex: 1; min-width: 0; }
        .title { font-size: 13px; font-weight: 700; margin-bottom: 4px; opacity: 0.85; }
        .message { font-size: 15px; font-weight: 700; }
        .close {
          -webkit-app-region: no-drag;
          background: rgba(255,255,255,0.15);
          border: none;
          color: white;
          width: 26px;
          height: 26px;
          border-radius: 50%;
          cursor: pointer;
          font-size: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .close:hover { background: rgba(255,255,255,0.3); }
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(249, 115, 22, 0.4), 0 20px 40px rgba(0,0,0,0.5); }
          50% { box-shadow: 0 0 0 8px rgba(249, 115, 22, 0), 0 20px 40px rgba(0,0,0,0.5); }
        }
      </style>
    </head>
    <body>
      <div class="card" onclick="window.close()">
        <div class="emoji">${emoji}</div>
        <div class="content">
          <div class="title">點餐提醒</div>
          <div class="message">${shopName} ${label}截止！</div>
        </div>
        <button class="close" onclick="event.stopPropagation(); window.close()">✕</button>
      </div>
    </body>
    </html>
  `;

  reminderWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

  // 點擊視窗本體 → 開啟主視窗
  reminderWindow.webContents.on('before-input-event', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  // 15 秒後自動關閉
  reminderWindowTimer = setTimeout(() => {
    if (reminderWindow && !reminderWindow.isDestroyed()) {
      reminderWindow.close();
    }
  }, 15000);

  reminderWindow.on('closed', () => {
    reminderWindow = null;
    if (reminderWindowTimer) {
      clearTimeout(reminderWindowTimer);
      reminderWindowTimer = null;
    }
  });
};

const checkNotifications = () => {
  if (!jsonService) return;

  const data = jsonService.getOrders();
  if (!data || !data.activeSessions) return;

  const now = new Date();
  const notified = getNotifiedSessions();

  data.activeSessions.forEach(session => {
    if (!session.deadline) return;

    const deadlineDate = new Date(session.deadline);
    if (now >= deadlineDate) return; // 已截止不通知

    const alreadyNotified = notified[session.id] || [];

    for (const stage of REMINDER_STAGES) {
      const stageKey = `${stage.minutes}min`;
      if (alreadyNotified.includes(stageKey)) continue;

      const reminderTime = new Date(deadlineDate.getTime() - stage.minutes * 60 * 1000);
      if (now >= reminderTime) {
        // 彈出提醒小視窗
        showReminderWindow(session.shopName, stage.label, stage.urgent);

        // 系統通知（雙重保險）
        const notification = new Notification({
          title: '🍵 點餐提醒',
          body: `${session.shopName} ${stage.label}截止！請記得點餐。`,
          icon: getIconPath(),
        });

        notification.on('click', () => {
          if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.show();
            mainWindow.focus();
          }
        });

        notification.show();

        // Taskbar 閃爍
        if (mainWindow && !mainWindow.isFocused()) {
          mainWindow.flashFrame(true);
        }

        markNotified(session.id, stageKey);
        break;
      }
    }
  });

  // 清理已結束 session 的通知紀錄
  const activeIds = new Set(data.activeSessions.map(s => s.id));
  const config = loadConfig();
  if (config.notifiedSessions) {
    let changed = false;
    for (const id of Object.keys(config.notifiedSessions)) {
      if (!activeIds.has(id)) {
        delete config.notifiedSessions[id];
        changed = true;
      }
    }
    if (changed) saveConfig(config);
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
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, '../public/icon.png'),
    frame: false, // Frameless window
    titleBarStyle: 'hidden', // Hide title bar but keep controls overlay (we will build custom controls)
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      return false;
    }
  });

  // In production, load the index.html of the app.
  // In development, load the local server URL.
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5174');
    // mainWindow.webContents.openDevTools(); // Disable auto-open DevTools
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
};

// IPC Handlers
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('get-shops', () => {
  return jsonService.getShops();
});

ipcMain.handle('get-history', () => {
  return jsonService.getHistory();
});

ipcMain.handle('start-session', (event, { shop, deadline, host, teaTime }) => {
  return jsonService.startSession(shop, deadline, host, teaTime);
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
  createTray();

  // Check for notifications every 60 seconds
  setInterval(checkNotifications, 60 * 1000);
  // Initial check in case we just started past a deadline
  setTimeout(checkNotifications, 5000);



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

ipcMain.handle('get-members', () => {
  return jsonService.getMembers();
});

ipcMain.handle('save-member', (event, member) => {
  return jsonService.saveMember(member);
});

ipcMain.handle('delete-member', (event, id) => {
  return jsonService.deleteMember(id);
});

// Window Control Handlers
ipcMain.on('window-minimize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.minimize();
});

ipcMain.on('window-maximize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
  }
});

ipcMain.on('window-close', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.close();
});

// --- Update Mechanism (Hybrid: GitHub + Shared Folder) ---
const { autoUpdater } = require('electron-updater');

// semver 版本比較：回傳 1 (a>b), -1 (a<b), 0 (a==b)
const compareVersions = (a, b) => {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] || 0;
    const nb = pb[i] || 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }
  return 0;
};

// Configure autoUpdater
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

// Add logging for debugging
autoUpdater.on('checking-for-update', () => {
  console.log('[AutoUpdater] Checking for update...');
});
autoUpdater.on('update-available', (info) => {
  console.log('[AutoUpdater] Update available:', info);
});
autoUpdater.on('update-not-available', (info) => {
  console.log('[AutoUpdater] Update not available:', info);
});
autoUpdater.on('error', (err) => {
  console.error('[AutoUpdater] Error:', err);
});
autoUpdater.on('download-progress', (progressObj) => {
  if (mainWindow) {
    mainWindow.webContents.send('update-progress', progressObj);
  }
});

ipcMain.handle('check-for-update', async () => {
  let githubResult = null;
  
  // 1. Try GitHub Auto-Update First
  try {
    // Only check if we have a repository configured (basic check)
    // autoUpdater will throw if not configured, so we wrap in try-catch
    const result = await autoUpdater.checkForUpdates();
    
    if (result && result.updateInfo) {
      const remoteVersion = result.updateInfo.version;
      const currentVersion = app.getVersion();
      
      // semver comparison is handled by autoUpdater, but we double check
      if (remoteVersion !== currentVersion) { // autoUpdater only returns if update available usually? No, it returns result regardless.
        // Actually checkForUpdates returns result.downloadPromise if autoDownload is true.
        // If autoDownload is false, it returns UpdateCheckResult.
        // We need to check if update is actually available.
        // autoUpdater emits 'update-available' if there is one.
        // But here we are waiting for the promise.
        
        // Simple version compare (string compare might be enough if format is strict, but semver is safer)
        // Let's rely on autoUpdater's result object if possible, or just compare strings
        if (compareVersions(remoteVersion, currentVersion) > 0) {
           return {
             hasUpdate: true,
             remoteVersion,
             releaseNotes: result.updateInfo.releaseNotes || '',
             installerPath: 'GITHUB_AUTO_UPDATE', // Flag for perform-update
             source: 'github'
           };
        }
      }
    }
  } catch (error) {
    console.log('GitHub update check failed:', error);
    // If we are testing GitHub updates specifically, we might want to see this error.
    // Let's return it if local check is not configured or fails.
    githubResult = { hasUpdate: false, error: 'GitHub Update Failed: ' + error.message };
  }

  // 2. Fallback to Shared Folder Strategy
  try {
    const config = loadConfig();
    const dataDir = config.dataDir;

    // If no dataDir, and we had a GitHub error, return the GitHub error
    if (!dataDir) {
      return githubResult || { hasUpdate: false, message: '未設定資料路徑，無法搜尋更新' };
    }

    // 取得上一層目錄
    const updateDir = path.resolve(dataDir, '..');
    const versionFile = path.join(updateDir, 'version.json');

    if (!fs.existsSync(versionFile)) {
      return { hasUpdate: false, message: '找不到版本資訊檔' };
    }

    let remoteData;
    try {
      remoteData = JSON.parse(fs.readFileSync(versionFile, 'utf-8'));
    } catch (e) {
      return { hasUpdate: false, message: '版本資訊檔格式錯誤' };
    }
    const remoteVersion = remoteData.version;
    const currentVersion = app.getVersion();

    // 簡單字串比對
    if (remoteVersion && compareVersions(remoteVersion, currentVersion) > 0) {
      const installerName = remoteData.installerName || `Afternoon Tea Setup ${remoteVersion}.exe`;
      const installerPath = path.join(updateDir, installerName);

      // 確認安裝檔是否存在
      if (!fs.existsSync(installerPath)) {
        return { 
          hasUpdate: true, 
          remoteVersion, 
          error: '偵測到新版本，但找不到安裝檔',
          installerPath 
        };
      }

      return { 
        hasUpdate: true, 
        remoteVersion, 
        installerPath,
        releaseNotes: remoteData.releaseNotes || '',
        source: 'local'
      };
    }
    
    // If we reached here, local check found no update.
    // If GitHub check failed previously, return that error so we know why.
    if (githubResult && githubResult.error) {
      return { hasUpdate: false, error: githubResult.error + ' (Local check also found no update)' };
    }

    return { hasUpdate: false, message: '目前已是最新版本' };
    
  } catch (error) {
    // If both failed, return the GitHub error if it exists, otherwise the local error
    if (githubResult && githubResult.error) {
      return { hasUpdate: false, error: `${githubResult.error} | Local: ${error.message}` };
    }
    return { hasUpdate: false, error: error.message };
  }
});

ipcMain.handle('perform-update', async (event, installerPath) => {
  // Case 1: GitHub Update
  if (installerPath === 'GITHUB_AUTO_UPDATE') {
    try {
      // Trigger download
      await autoUpdater.downloadUpdate();
      // Wait for download to finish is handled by the promise? 
      // downloadUpdate returns a Promise that resolves to the downloaded file path.
      
      // Once downloaded, we quit and install.
      // However, we might want to notify the user "Downloading..."?
      // For now, let's just wait and install.
      // NOTE: This might freeze the UI if we await it without progress.
      // But since we are in a 'handle', the renderer awaits this.
      
      autoUpdater.quitAndInstall();
      return { success: true };
    } catch (e) {
      return { success: false, message: '下載更新失敗: ' + e.message };
    }
  }

  // Case 2: Local Shared Folder Update
  const { shell } = require('electron');
  if (fs.existsSync(installerPath)) {
    shell.openPath(installerPath);
    setTimeout(() => app.quit(), 1000); // 1秒後關閉程式讓安裝檔執行
    return { success: true };
  } else {
    return { success: false, message: '找不到安裝檔' };
  }
});
