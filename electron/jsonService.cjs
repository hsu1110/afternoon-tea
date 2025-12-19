const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class JsonService {
  constructor(userDataPath) {
    // 直接使用傳入的路徑，不再自動建立 data 子資料夾
    this.dataDir = userDataPath;
    this.ensureDataDir();
  }

  ensureDataDir() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  // 讀取 JSON 檔案
  read(filename) {
    const filePath = path.join(this.dataDir, filename);
    if (!fs.existsSync(filePath)) {
      return null;
    }
    try {
      const data = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.error(`Error reading ${filename}:`, error);
      return null;
    }
  }

  // 寫入 JSON 檔案
  write(filename, data) {
    const filePath = path.join(this.dataDir, filename);
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
      return true;
    } catch (error) {
      console.error(`Error writing ${filename}:`, error);
      return false;
    }
  }

  // 初始化資料
  initSampleData() {
    const shopsPath = 'shops.json';
    // 如果檔案不存在，建立一個空的店家列表
    if (!this.read(shopsPath)) {
      this.write(shopsPath, []);
    }
  }
  // 取得店家列表
  getShops() {
    return this.read('shops.json') || [];
  }

  // 取得菜單圖片
  getMenuImage(shopId) {
    const extensions = ['jpg', 'jpeg', 'png', 'webp'];
    const menusDir = path.join(this.dataDir, 'menus');
    for (const ext of extensions) {
      const filePath = path.join(menusDir, `${shopId}.${ext}`);
      if (fs.existsSync(filePath)) {
        const fileData = fs.readFileSync(filePath);
        const base64 = fileData.toString('base64');
        return `data:image/${ext};base64,${base64}`;
      }
    }
    return null;
  }

  // 取得訂單資料 (只讀取進行中的訂單)
  getOrders() {
    const data = this.read('orders.json');
    if (!data) {
      return { activeSessions: [] };
    }
    // Migration: If old format (activeSession object), convert to array
    if (data.activeSession && !Array.isArray(data.activeSessions)) {
      data.activeSessions = data.activeSession ? [data.activeSession] : [];
      delete data.activeSession;
      this.write('orders.json', data);
    }
    // Ensure structure
    if (!data.activeSessions) data.activeSessions = [];
    
    return data;
  }

  // 取得歷史紀錄
  getHistory() {
    return this.read('history.json') || [];
  }

  // 開啟新團
  // 開啟新團
  startSession(shop, deadline = null, host = null) {
    const data = this.getOrders();
    const newSession = {
      id: crypto.randomUUID(),
      shopId: shop.id,
      shopName: shop.name,
      deadline: deadline,
      hostId: host ? host.id : null,
      hostName: host ? host.name : null,
      orders: [],
      startTime: new Date().toISOString(),
      status: 'active'
    };
    
    data.activeSessions.push(newSession);
    this.write('orders.json', data);
    return newSession;
  }

  // 送出訂單
  submitOrder(order) {
    const data = this.getOrders();
    if (!data.activeSessions || data.activeSessions.length === 0) {
      throw new Error('No active sessions');
    }

    // Find session
    const sessionIndex = data.activeSessions.findIndex(s => s.id === order.sessionId);
    if (sessionIndex === -1) {
      throw new Error('Session not found');
    }

    const session = data.activeSessions[sessionIndex];
    
    // Check deadline
    if (session.deadline && new Date() > new Date(session.deadline)) {
      throw new Error('Session expired');
    }

    const newOrder = {
      id: crypto.randomUUID(),
      ...order,
      timestamp: new Date().toISOString()
    };

    session.orders.push(newOrder);
    this.write('orders.json', data);
    return newOrder;
  }

  // 刪除訂單
  deleteOrder(orderId) {
    const data = this.getOrders();
    let found = false;

    for (const session of data.activeSessions) {
      const initialLength = session.orders.length;
      session.orders = session.orders.filter(o => o.id !== orderId);
      if (session.orders.length !== initialLength) {
        found = true;
        break;
      }
    }

    if (found) {
      this.write('orders.json', data);
      return true;
    }
    return false;
  }

  // 更新訂單
  updateOrder(updatedOrder) {
    const data = this.getOrders();
    let found = false;

    for (const session of data.activeSessions) {
      const index = session.orders.findIndex(o => o.id === updatedOrder.id);
      if (index !== -1) {
        session.orders[index] = { ...session.orders[index], ...updatedOrder };
        found = true;
        break;
      }
    }

    if (found) {
      this.write('orders.json', data);
      return true;
    }
    return false;
  }

  // 取得上次點餐紀錄
  getLastOrder(userName, shopId) {
    const data = this.getOrders();
    const history = this.getHistory();
    
    // Search in history (reverse order for latest)
    const allSessions = [...data.activeSessions, ...history];
    
    // Sort sessions by time desc
    allSessions.sort((a, b) => new Date(b.startTime || 0) - new Date(a.startTime || 0));

    for (const session of allSessions) {
      if (session.shopId === shopId) {
        // Find order by user in this session
        // Sort orders by timestamp desc if possible, but usually just finding the last one is enough
        const userOrder = session.orders.find(o => o.name === userName);
        if (userOrder) {
          return userOrder;
        }
      }
    }
    return null;
  }

  // 更新權重 (公平演算法)
  updateShopWeights(winnerId) {
    const shops = this.read('shops.json');
    if (!shops) return false;

    let hasChanges = false;
    const updatedShops = shops.map(shop => {
      let newWeight = shop.weight || 1;
      if (shop.id === winnerId) {
        newWeight = 1; // 中獎者重置
      } else {
        newWeight += 1; // 其他人 +1
      }
      
      if (newWeight !== shop.weight) {
        hasChanges = true;
        return { ...shop, weight: newWeight };
      }
      return shop;
    });

    if (hasChanges) {
      this.write('shops.json', updatedShops);
    }
    return updatedShops;
  }

  // 取得資金紀錄 (自動補 ID)
  getFunds() {
    const funds = this.read('funds.json') || [];
    let hasChanges = false;

    const updatedFunds = funds.map(transaction => {
      if (!transaction.id) {
        hasChanges = true;
        return { ...transaction, id: crypto.randomUUID() };
      }
      return transaction;
    });

    if (hasChanges) {
      this.write('funds.json', updatedFunds);
    }
    return updatedFunds;
  }

  // 新增資金紀錄
  addFundTransaction(transaction) {
    const funds = this.getFunds(); // 使用 getFunds 確保都有 ID
    funds.push(transaction);
    return this.write('funds.json', funds);
  }

  // 儲存店家 (新增或更新)
  // 儲存店家 (新增或更新)
  saveShop(shop, imagePath) {
    const shops = this.read('shops.json') || [];
    
    // 如果是新店家，先產生 ID
    if (!shop.id) {
      // 改用遞增 ID: 找目前最大的數字 ID，然後 +1
      // 注意：如果舊資料是 UUID (亂碼)，會被視為 0 或忽略，新 ID 會從 1 開始
      const maxId = shops.reduce((max, s) => {
        const id = Number(s.id);
        return Number.isInteger(id) && id > max ? id : max;
      }, 0);
      shop.id = (maxId + 1).toString();
    }

    const index = shops.findIndex(s => s.id === shop.id);
    
    // 處理圖片
    if (imagePath) {
      const menusDir = path.join(this.dataDir, 'menus');
      if (!fs.existsSync(menusDir)) {
        fs.mkdirSync(menusDir, { recursive: true });
      }
      const ext = path.extname(imagePath);
      const destPath = path.join(menusDir, `${shop.id}${ext}`);
      fs.copyFileSync(imagePath, destPath);
    }

    if (index !== -1) {
      // 更新
      shops[index] = { ...shops[index], ...shop };
    } else {
      // 新增 (ID 已經在上面產生了)
      shops.push(shop);
    }
    return this.write('shops.json', shops);
  }

  // 刪除店家
  deleteShop(shopId) {
    const shops = this.read('shops.json') || [];
    const newShops = shops.filter(s => s.id !== shopId);
    
    // 刪除圖片 (嘗試刪除各種副檔名)
    const extensions = ['jpg', 'jpeg', 'png', 'webp'];
    const menusDir = path.join(this.dataDir, 'menus');
    for (const ext of extensions) {
      const filePath = path.join(menusDir, `${shopId}.${ext}`);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    return this.write('shops.json', newShops);
  }

  // 匯出訂單為 Excel
  exportOrdersToExcel(sessionId) {
    const XLSX = require('xlsx');
    const data = this.getOrders();
    
    // Default to the first active session or return error
    if (!data.activeSessions || data.activeSessions.length === 0) {
      return { success: false, message: '目前沒有進行中的訂購可匯出' };
    }

    let session;
    if (sessionId) {
      session = data.activeSessions.find(s => s.id === sessionId);
    } else {
      // Fallback to first session if no ID provided (though UI should provide it)
      session = data.activeSessions[0];
    }

    if (!session) {
      return { success: false, message: '找不到指定的訂購' };
    }

    const orders = session.orders;

    if (orders.length === 0) {
       return { success: false, message: '目前沒有訂單可匯出' };
    }

    // 準備資料
    const exportData = orders.map(order => ({
      '姓名': order.name,
      '品項': order.item,
      '價格': order.price,
      '備註': order.note || '',
      '時間': new Date(order.timestamp).toLocaleString()
    }));

    // 加入總計列
    const total = orders.reduce((sum, order) => sum + (order.price || 0), 0);
    exportData.push({ '姓名': '總計', '品項': `${orders.length} 項`, '價格': total, '備註': '', '時間': '' });

    // 建立工作表
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "訂單");

    // 產生檔名
    const dateStr = session.startTime ? session.startTime.split('T')[0] : new Date().toISOString().split('T')[0];
    const shopName = session.shopName;
    const filename = `訂單_${dateStr}_${shopName}.xlsx`;
    
    // 產生 Buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    return { success: true, buffer: buffer, defaultFilename: filename };
  }

  // 更新 Session (例如截止時間)
  updateSession(updates) {
    const data = this.getOrders();
    
    if (!data.activeSessions) return false;
    
    // updates must contain id
    if (!updates.id) return false;

    const index = data.activeSessions.findIndex(s => s.id === updates.id);
    if (index !== -1) {
       // Merge updates
       data.activeSessions[index] = { ...data.activeSessions[index], ...updates };
       return this.write('orders.json', data);
    }
    return false;
  }

  // 取消/結束 Session
  cancelSession(sessionId) {
    const data = this.getOrders();
    if (data.activeSessions) {
      const initialLength = data.activeSessions.length;
      data.activeSessions = data.activeSessions.filter(s => s.id !== sessionId);
      if (data.activeSessions.length !== initialLength) {
        return this.write('orders.json', data);
      }
    }
    return false;
  }

  // 結帳 (新增支出紀錄)
  checkoutSession(amount, shopName, sessionId) {
    const data = this.getOrders();
    const sessionIndex = data.activeSessions.findIndex(s => s.id === sessionId);
    
    if (sessionIndex === -1) {
      throw new Error('Session not found');
    }

    const session = data.activeSessions[sessionIndex];
    
    // Move to history
    const history = this.getHistory();
    
    const historyRecord = {
      ...session,
      finalAmount: amount,
      endTime: new Date().toISOString(),
      status: 'completed'
    };
    
    history.push(historyRecord);
    this.write('history.json', history);
    
    // Remove from active
    data.activeSessions.splice(sessionIndex, 1);
    this.write('orders.json', data);

    // Add to funds
    const transaction = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      type: 'expense',
      amount: Number(amount),
      note: `${shopName}`
    };
    return this.addFundTransaction(transaction);
  }

  // 更新資金紀錄
  updateFundTransaction(updatedTransaction) {
    const funds = this.read('funds.json') || [];
    const index = funds.findIndex(t => t.id === updatedTransaction.id);
    if (index !== -1) {
      funds[index] = { ...funds[index], ...updatedTransaction };
      return this.write('funds.json', funds);
    }
    return false;
  }

  // 刪除資金紀錄
  deleteFundTransaction(id) {
    const funds = this.read('funds.json') || [];
    const newFunds = funds.filter(t => t.id !== id);
    if (newFunds.length !== funds.length) {
      return this.write('funds.json', newFunds);
    }
    return false;
  }
  // 取得成員列表
  getMembers() {
    return this.read('members.json') || [];
  }

  // 儲存成員 (新增或更新)
  saveMember(member) {
    const members = this.getMembers();
    
    if (!member.id) {
      member.id = crypto.randomUUID();
    }

    const index = members.findIndex(m => m.id === member.id);
    if (index !== -1) {
      members[index] = { ...members[index], ...member };
    } else {
      members.push(member);
    }
    return this.write('members.json', members);
  }

  // 刪除成員
  deleteMember(id) {
    const members = this.getMembers();
    const newMembers = members.filter(m => m.id !== id);
    return this.write('members.json', newMembers);
  }
}

module.exports = JsonService;
