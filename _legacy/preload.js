const { contextBridge, ipcRenderer } = require('electron');

// 暴露安全的 API 給渲染程序
contextBridge.exposeInMainWorld('electronAPI', {
  // 載入店家資料
  loadShopsData: (customPath) => ipcRenderer.invoke('load-shops-data', customPath),
  
  // 選擇 Excel 檔案
  selectExcelFile: () => ipcRenderer.invoke('select-excel-file')
});
