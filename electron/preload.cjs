const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getShops: () => ipcRenderer.invoke('get-shops'),
  getHistory: () => ipcRenderer.invoke('get-history'),
  getMembers: () => ipcRenderer.invoke('get-members'),
  saveMember: (member) => ipcRenderer.invoke('save-member', member),
  deleteMember: (id) => ipcRenderer.invoke('delete-member', id),
  startSession: (shop, deadline, host, teaTime) => ipcRenderer.invoke('start-session', { shop, deadline, host, teaTime }),
  updateWeights: (winnerId) => ipcRenderer.invoke('update-weights', winnerId),
  submitOrder: (order) => ipcRenderer.invoke('submit-order', order),
  deleteOrder: (orderId) => ipcRenderer.invoke('delete-order', orderId),
  updateOrder: (order) => ipcRenderer.invoke('update-order', order),
  getOrders: () => ipcRenderer.invoke('get-orders'),
  getMenuImage: (shopId) => ipcRenderer.invoke('get-menu-image', shopId),
  getFunds: () => ipcRenderer.invoke('get-funds'),
  addFundTransaction: (transaction) => ipcRenderer.invoke('add-fund-transaction', transaction),
  saveShop: (shop, imagePath) => ipcRenderer.invoke('save-shop', { shop, imagePath }),
  deleteShop: (shopId) => ipcRenderer.invoke('delete-shop', shopId),
  selectImage: () => ipcRenderer.invoke('select-image'),
  exportOrders: (sessionId) => ipcRenderer.invoke('export-orders', sessionId),
  getLastOrder: (user, shopId) => ipcRenderer.invoke('get-last-order', { user, shopId }),
  updateSession: (updates) => ipcRenderer.invoke('update-session', updates),
  cancelSession: (sessionId) => ipcRenderer.invoke('cancel-session', sessionId),
  checkoutSession: (amount, shopName, sessionId) => ipcRenderer.invoke('checkout-session', amount, shopName, sessionId),
  updateFundTransaction: (transaction) => ipcRenderer.invoke('update-fund-transaction', transaction),
  deleteFundTransaction: (id) => ipcRenderer.invoke('delete-fund-transaction', id),
  getDataPath: () => ipcRenderer.invoke('get-data-path'),
  setDataPath: () => ipcRenderer.invoke('set-data-path'),
  
  // Gemini API
  getApiKey: () => ipcRenderer.invoke('get-api-key'),
  saveApiKey: (key) => ipcRenderer.invoke('save-api-key', key),
  deleteApiKey: () => ipcRenderer.invoke('delete-api-key'),
  getSelectedModel: () => ipcRenderer.invoke('get-selected-model'),
  saveSelectedModel: (modelName) => ipcRenderer.invoke('save-selected-model', modelName),
  getCachedModels: () => ipcRenderer.invoke('get-cached-models'),
  saveCachedModels: (models) => ipcRenderer.invoke('save-cached-models', models),
  fetchAvailableModels: (apiKey) => ipcRenderer.invoke('fetch-available-models', apiKey),
  scanMenu: (params) => ipcRenderer.invoke('scan-menu', params),
  getMenu: (shopId) => ipcRenderer.invoke('get-menu', shopId),
  saveMenu: (shopId, menuData) => ipcRenderer.invoke('save-menu', shopId, menuData),

  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  
  // Update API
  checkForUpdate: () => ipcRenderer.invoke('check-for-update'),
  performUpdate: (installerPath) => ipcRenderer.invoke('perform-update', installerPath),
  onUpdateProgress: (callback) => ipcRenderer.on('update-progress', (event, value) => callback(value)),

  // 點餐提醒 API
  onOrderReminder: (callback) => ipcRenderer.on('order-reminder', (event, data) => callback(data)),
});
