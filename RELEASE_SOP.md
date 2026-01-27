# 🚀 下午茶 App 發佈流程 SOP

本文件說明如何透過 GitHub Actions 自動打包並發佈新版本的 Windows 安裝檔。

## 📋 前置檢查
1. 確保你的程式碼已經在本地測試通過。
2. 確保 `package.json` 中的 `repository` 欄位已設定正確。

## 🛠️ 發佈步驟

### 第一步：修改版本號
打開 `package.json`，將 `version` 欄位修改為新的版本號（例如從 `1.0.3` 改為 `1.0.4`）。

```json
{
  "name": "afternoon_tea",
  "version": "1.0.4", 
  ...
}
```

### 第二步：提交程式碼 (Commit & Push)
將修改後的版本號提交到 GitHub。

```bash
# 1. 加入修改
git add package.json

# 2. 提交 (訊息可以寫 "Bump version to 1.0.4")
git commit -m "Bump version to 1.0.4"

# 3. 推送到 GitHub
git push
```

### 第三步：打標籤並觸發自動發佈 (Tag & Release)
這是最關鍵的一步。GitHub Actions 會監聽 `v` 開頭的標籤來啟動打包流程。

```bash
# 1. 建立標籤 (注意：標籤名稱建議與 package.json 版本一致，並加上 v 前綴)
git tag v1.0.4

# 2. 推送標籤到 GitHub (這會立即觸發 CI/CD)
git push origin v1.0.4
```

---

## ⏳ 等待與驗證

### 1. 檢查打包進度
前往 GitHub 倉庫的 **Actions** 頁面：
`https://github.com/hsu1110/afternoon-tea/actions`

*   你會看到一個正在執行的 Workflow (黃色轉圈)。
*   等待它變成 **綠色勾勾 ✅** (通常需要 3-5 分鐘)。

### 2. 下載安裝檔
前往 GitHub 倉庫的 **Releases** 頁面：
`https://github.com/hsu1110/afternoon-tea/releases`

*   你會看到最新的 `v1.0.4` 版本。
*   在 Assets 區域，應該會有 `Afternoon Tea Setup 1.0.4.exe`。

### 3. 用戶端自動更新
*   用戶打開舊版 App 時，會自動偵測到這個新版本並開始下載。
*   如果 GitHub 更新失敗，App 會自動切換回檢查共用資料夾的模式 (雙軌並行)。
