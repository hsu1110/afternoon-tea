# 🚀 下午茶 App 發佈流程 SOP

本文件說明如何透過 GitHub Actions 自動打包並發佈新版本的 Windows 安裝檔，以及如何管理自動更新。

## 📋 前置檢查
1.  **Repository 設定**: 確保 `package.json` 中有 `publish` 設定 (指向 GitHub Repo)。
2.  **版本號**: `package.json` 的 `version` 必須大於目前線上版本。

## 🛠️ 發佈步驟

### 第一步：修改版本號與更新內容
打開 `package.json`：
1.  修改 `version` (例如 `1.0.8`)。
2.  修改 `releaseNotes`。
    *   **格式建議**: 使用標準 Markdown 語法，換行請用 `\n`。
    *   **範例**: `"1. 新增功能A\n2. 修正問題B"`
    *   (程式已內建相容 `/n`，但建議統一用 `\n`)

```json
{
  "name": "afternoon_tea",
  "version": "1.0.8",
  "releaseNotes": "1. 新增功能A\n2. 修正問題B",
  ...
}
```

### 第二步：提交程式碼 (Commit & Push)
```bash
git add package.json
git commit -m "chore: bump version to 1.0.8"
git push
```

### 第三步：打標籤並觸發自動發佈 (Tag & Release)
GitHub Actions 會監聽 `v` 開頭的標籤來啟動打包流程。

```bash
# 1. 建立標籤 (必須是 v 開頭)
git tag v1.0.8

# 2. 推送標籤 (這會觸發 GitHub Action)
git push --tags
```

---

## ⏳ 等待與驗證

### 1. 檢查打包進度
前往 GitHub **Actions** 頁面，等待 Workflow 變成 **綠色勾勾 ✅**。

### 2. 發佈 Release (重要！)
前往 GitHub **Releases** 頁面：
1.  點選剛產生的版本 (例如 `v1.0.8`)。
2.  **檢查 Assets**: 確認裡面有 `.exe` 檔 **以及 `latest.yml`** (這是自動更新的關鍵)。
3.  **發佈 (Publish)**:
    *   如果標題旁有灰色的 `Draft` 標籤，自動更新**不會**生效。
    *   點擊 **Edit** (鉛筆圖示) -> 捲到底下點擊 **Publish release**。
    *   (這時您也可以再次編輯 Release Notes，這裡的內容就是用戶會看到的更新說明)。

---

## 🔄 自動更新機制 (Hybrid 模式)

本程式採用 **雙重保險** 更新機制：

1.  **優先檢查 GitHub**:
    *   程式會先去 GitHub 檢查是否有 **已發佈 (Published)** 的新版本。
    *   如果有，會顯示藍色進度條進行下載。
    *   **注意**: 如果 Release 還是 `Draft` 狀態，程式會看不到更新。

2.  **後備檢查 本地端 (共用資料夾)**:
    *   如果 GitHub 沒更新 (或連不上)，程式會去檢查 `version.json` 指定的路徑。
    *   **適用情境**: 內網測試、GitHub 掛掉時。
    *   **部署方式**: 手動將 `release` 資料夾內的 `.exe` 和 `version.json` 複製到共用資料夾。

---

## 🚑 疑難排解

### Q: 打錯 Tag 了怎麼辦？
如果您不小心打錯了 Tag (例如 `v1.0.8`) 並且已經推上去了：

1.  **刪除本地 Tag**:
    ```bash
    git tag -d v1.0.8
    ```
2.  **刪除遠端 Tag**:
    ```bash
    git push origin :refs/tags/v1.0.8
    ```
    *(注意冒號前有一個空格)*

### Q: 更新視窗的內容排版跑掉？
*   請確認 `package.json` 或 GitHub Release 描述中使用的是標準 Markdown 語法。
*   列表項目建議寫法：`1. 項目A` (數字點後面要有一個空格)。
*   換行請用 `\n`。

### Q: 為什麼 GitHub 更新沒有進度條？
*   請確認您安裝的是支援進度條的新版本 (v1.0.7+)。
*   如果是走「本地端更新」，因為速度極快且直接開啟安裝檔，所以**不會**顯示進度條，這是正常現象。
