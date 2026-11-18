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
    frame: true, // Enable native frame for Aero Snap
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

ipcMain.handle('get-api-key', () => {
  const config = loadConfig();
  return config.geminiApiKey || '';
});

ipcMain.handle('save-api-key', (event, key) => {
  const config = loadConfig();
  config.geminiApiKey = key;
  saveConfig(config);
  return { success: true };
});

ipcMain.handle('delete-api-key', () => {
  const config = loadConfig();
  delete config.geminiApiKey;
  saveConfig(config);
  return { success: true };
});

ipcMain.handle('get-selected-model', () => {
  const config = loadConfig();
  return config.selectedModel || '';
});

ipcMain.handle('save-selected-model', (event, modelName) => {
  const config = loadConfig();
  config.selectedModel = modelName;
  saveConfig(config);
  return { success: true };
});

ipcMain.handle('get-cached-models', () => {
  return jsonService.getAiModels();
});

ipcMain.handle('save-cached-models', (event, models) => {
  return jsonService.saveAiModels(models);
});

ipcMain.handle('get-model-usage', () => {
  return jsonService.getModelUsage();
});

ipcMain.handle('clear-model-usage', () => {
  return jsonService.clearModelUsage();
});

// 解析版本號為 [major, minor] 整數元組（避免浮點數誤判 3.10 < 3.6）
const extractModelVersionTuple = (id) => {
  const match = id.match(/gemini-(\d+)(?:\.(\d+))?/i);
  if (!match) return [0, 0];
  return [parseInt(match[1], 10), match[2] ? parseInt(match[2], 10) : 0];
};

// 依版本號由新到舊排序：正式使用中優先於棄用、正式版優先於 preview
const sortModelsNewestFirst = (modelsList) => {
  return modelsList.sort((a, b) => {
    const [majA, minA] = extractModelVersionTuple(a.id);
    const [majB, minB] = extractModelVersionTuple(b.id);
    if (majB !== majA) return majB - majA;
    if (minB !== minA) return minB - minA;

    if (Boolean(a.deprecated) !== Boolean(b.deprecated)) {
      return a.deprecated ? 1 : -1;
    }

    const isPrevA = a.id.includes('preview');
    const isPrevB = b.id.includes('preview');
    if (isPrevA !== isPrevB) {
      return isPrevA ? 1 : -1;
    }

    return a.id.localeCompare(b.id);
  });
};

// 共用 HTTPS GET（含逾時與 3xx 重導向處理）
const httpsGetText = (urlStr, headers = {}, timeoutMs = 10000, redirectsLeft = 3) => {
  return new Promise((resolve, reject) => {
    const https = require('https');
    const parsed = new URL(urlStr);
    const req = https.request({
      hostname: parsed.hostname,
      path: `${parsed.pathname}${parsed.search}`,
      method: 'GET',
      headers: {
        'User-Agent': 'AfternoonTeaApp/1.0',
        ...headers
      }
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && redirectsLeft > 0) {
        res.resume();
        const nextUrl = new URL(res.headers.location, urlStr).toString();
        return httpsGetText(nextUrl, headers, timeoutMs, redirectsLeft - 1).then(resolve, reject);
      }
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => resolve({ statusCode: res.statusCode, body }));
    });
    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error('連線逾時'));
    });
    req.on('error', reject);
    req.end();
  });
};

// 取得帳號下所有分頁的 Gemini 模型清單
const fetchAllGeminiModels = async (apiKey) => {
  const allModels = [];
  let pageToken = '';

  do {
    const query = `pageSize=1000&key=${encodeURIComponent(apiKey)}${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`;
    const url = `https://generativelanguage.googleapis.com/v1beta/models?${query}`;
    const { statusCode, body } = await httpsGetText(url, { 'x-goog-api-key': apiKey });

    if (statusCode < 200 || statusCode >= 300) {
      let errMsg = `HTTP Error ${statusCode}`;
      try {
        const errObj = JSON.parse(body);
        errMsg = errObj.error?.message || errMsg;
      } catch (e) {}
      throw new Error(errMsg);
    }

    const data = JSON.parse(body);
    if (Array.isArray(data.models)) {
      allModels.push(...data.models);
    }
    pageToken = data.nextPageToken || '';
  } while (pageToken);

  return allModels;
};

// 從 Google 官方定價文件抓取即時免費額度與棄用狀態對照表
const fetchOfficialFreeTierMap = async () => {
  const { statusCode, body } = await httpsGetText('https://ai.google.dev/gemini-api/docs/pricing.md.txt', {}, 8000);
  if (statusCode < 200 || statusCode >= 300) {
    throw new Error(`定價文件請求失敗 (${statusCode})`);
  }

  const modelStatus = new Map();
  const sections = body.split(/^## /m).slice(1);
  for (const section of sections) {
    const headerPart = section.split(/\{% hr \/%\}|\{% tabs %\}/)[0];
    const ids = [...headerPart.matchAll(/\[`([a-z0-9][a-z0-9.-]+)`\]\(\/docs\/models\//gi)].map(m => m[1].toLowerCase());
    if (ids.length === 0) continue;

    const standardTab = section.match(/\{% tab title="Standard" %\}([\s\S]*?)\{% \/tab %\}/)?.[1] || section;
    const rows = standardTab.split('---').map(r => r.trim());
    const inputRow = rows.find(r => /\*\s*Input price/i.test(r)) || '';
    const outputRow = rows.find(r => /\*\s*Output price/i.test(r)) || '';
    const isFree = /Free of charge/i.test(inputRow) && /Free of charge/i.test(outputRow);
    const isDeprecated = /\*\*?Deprecated/i.test(section) || /is\s+\[deprecated\]/i.test(section);

    for (const id of ids) {
      modelStatus.set(id, { isFree, isDeprecated });
    }
  }
  return modelStatus;
};

// 判斷是否為通用文字/多模態內容生成模型（排除生圖、語音、串流、機器人等專用模型）
const isGeneralTextModel = (id, supportedGenerationMethods) => {
  const hasGen = Array.isArray(supportedGenerationMethods) && supportedGenerationMethods.includes('generateContent');
  if (!hasGen) return false;

  const isSpecialized =
    id.includes('image') ||
    id.includes('banana') ||
    id.includes('tts') ||
    id.includes('lyria') ||
    id.includes('transcribe') ||
    id.includes('omni') ||
    /(^|-)live(-|$)/.test(id) ||
    id.includes('robotics') ||
    id.includes('computer-use') ||
    id.includes('deep-research') ||
    id.includes('antigravity') ||
    id.includes('embedding') ||
    id.includes('imagen') ||
    id.includes('veo') ||
    id.includes('aqa') ||
    id.includes('decision') ||
    id.includes('customtools');

  return !isSpecialized && (id.startsWith('gemini-') || id.includes('flash') || id.includes('pro'));
};

// 當官方定價文件無法連線時的備援免費模型規則過濾
const isFreeModelFallback = (id) => {
  const paidOrAmbiguous =
    id.includes('argon') ||
    id.includes('carbon') ||
    id.includes('ultra') ||
    id.includes('pro-preview') ||
    id.endsWith('-latest');

  if (paidOrAmbiguous) return false;
  return id.includes('hydrogen') || id.includes('flash') || id === 'gemini-2.5-pro';
};

ipcMain.handle('fetch-available-models', async (event, apiKey) => {
  try {
    const keyToUse = (apiKey && apiKey.trim()) || loadConfig().geminiApiKey;
    if (!keyToUse) {
      return { success: false, message: '請先設定或輸入 API Key' };
    }

    // 同時向 Gemini API 取回全部模型，並向 Google 官方定價文件抓取最新免費額度列表
    const [rawModels, pricingResult] = await Promise.all([
      fetchAllGeminiModels(keyToUse),
      fetchOfficialFreeTierMap().catch((err) => {
        console.warn('無法抓取官方定價文件，改用規則備援過濾:', err.message);
        return null;
      })
    ]);

    const hasOfficialPricing = pricingResult && pricingResult.size >= 3;

    let validModels = rawModels
      .filter((m) => {
        const id = (m.name || '').replace(/^models\//, '').toLowerCase();
        if (!isGeneralTextModel(id, m.supportedGenerationMethods)) return false;

        if (hasOfficialPricing) {
          return pricingResult.get(id)?.isFree === true;
        }
        return isFreeModelFallback(id);
      })
      .map((m) => {
        const id = m.name.replace(/^models\//, '');
        const deprecated = hasOfficialPricing ? Boolean(pricingResult.get(id.toLowerCase())?.isDeprecated) : false;
        return {
          id,
          label: `${m.displayName || id} (${id})${deprecated ? ' [即將棄用]' : ''}`,
          deprecated
        };
      });

    if (validModels.length === 0) {
      return { success: false, message: '未找到可用的免費額度 Gemini 模型' };
    }

    validModels = sortModelsNewestFirst(validModels);

    // 覆蓋寫入公用目錄的 ai_models.json，讓所有共用人員同步取得最新清單
    const saved = jsonService.saveAiModels(validModels);
    return {
      success: true,
      models: saved.models,
      updatedAt: saved.updatedAt,
      pricingFallback: !hasOfficialPricing
    };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

const { GoogleGenerativeAI } = require('@google/generative-ai');
const crypto = require('crypto');

ipcMain.handle('scan-menu', async (event, { shopId, shopName, imageBase64, apiKey, model: requestedModel }) => {
  const config = loadConfig();
  const sharedModels = jsonService.getAiModels().models;
  const candidateModel = requestedModel || config.selectedModel;
  // 僅允許使用公用目錄已同步清單內的模型，防止舊設定或異常請求誤用付費模型
  const selectedModel = sharedModels.some(m => m.id === candidateModel)
    ? candidateModel
    : sharedModels[0]?.id;
  if (!selectedModel) {
    return { success: false, message: '共用目錄尚未同步可用模型，請先點擊「同步最新模型」' };
  }
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const promptTemplate = fs.readFileSync(path.join(__dirname, 'prompt/prompt.md'), 'utf-8');

    const userPromptStr = promptTemplate
      .replace(/{{shopName}}/g, shopName);

    const matches = imageBase64.match(/^data:(.+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      throw new Error('Invalid image format');
    }
    const mimeType = matches[1];
    const base64Data = matches[2];

    const model = genAI.getGenerativeModel({
      model: selectedModel,
      generationConfig: {
        responseMimeType: "application/json",
      },
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
      ]
    });

    const result = await model.generateContent([
      userPromptStr,
      { inlineData: { data: base64Data, mimeType: mimeType } }
    ]);

    const usageMeta = result.response.usageMetadata || {};
    const promptTokens = usageMeta.promptTokenCount || usageMeta.promptTokens || 0;
    const candidateTokens = usageMeta.candidatesTokenCount || usageMeta.candidatesTokens || 0;
    const totalTokens = usageMeta.totalTokenCount || usageMeta.totalTokens || 0;

    jsonService.recordModelUsage({
      model: selectedModel,
      shopName,
      promptTokens,
      candidateTokens,
      totalTokens,
      success: true
    });

    const parsedData = JSON.parse(result.response.text());
    
    parsedData.shop_id = shopId;
    if (parsedData.categories) {
      parsedData.categories.forEach(category => {
        if (category.items) {
          category.items = category.items.map(item => ({
            ...item,
            item_id: `${shopId}_${item.item_id || crypto.randomUUID()}` 
          }));
        }
      });
    }

    return { success: true, data: parsedData, usage: { promptTokens, candidateTokens, totalTokens, model: selectedModel } };
  } catch (error) {
    console.error('Gemini API Error:', error);
    jsonService.recordModelUsage({
      model: selectedModel,
      shopName,
      success: false,
      error: error.message
    });
    return { success: false, message: error.message };
  }
});

ipcMain.handle('get-menu', (event, shopId) => {
  return jsonService.getMenu(shopId);
});

ipcMain.handle('save-menu', (event, shopId, menuData) => {
  return jsonService.saveMenu(shopId, menuData);
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
