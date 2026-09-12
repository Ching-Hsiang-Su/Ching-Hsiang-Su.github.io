# 作品更新流程

網站的作品資料集中在 `portfolio.json`。照片頁與影片頁會自動讀取這份檔案，因此新增作品時不需要編輯各分類的 HTML。

## 檔案分工

- `portfolio.json`：作品名稱、年份、類型、順序、圖片編號與 YouTube ID。
- `scripts/process_images.py`：將原始照片縮至適合網頁的尺寸，並輸出 WebP。
- `images/portfolio/<分類>/`：網站使用的大圖。
- `images/portfolio/<分類>/thumbs/`：輪播使用的縮圖；目前 `event` 分類會自動建立。

目前的照片分類代號為：

| 頁面 | 分類代號 | 下一個自動編號 |
| --- | --- | ---: |
| 藝文攝影 | `art` | 12 |
| 活動紀錄 | `event` | 57 |
| 美食棚拍 | `food` | 11 |
| 風景攝影 | `landscape` | 9 |

腳本會依 `portfolio.json` 自動推算下一個編號，因此這張表只供快速核對。

## 新增一組照片作品

1. 在 `incoming/` 內建立暫存資料夾，放入已選好的原始照片。
2. 先把檔名排成想顯示的順序，例如 `01.jpg`、`02.jpg`、`03.jpg`。腳本會按檔名中的數字自然排序。
3. 在專案根目錄執行圖片處理腳本。以下範例會把照片加入活動紀錄：

   ```bash
   python3 scripts/process_images.py incoming/新作品 event
   ```

4. 腳本完成後會顯示一段 JSON。調整 `id`、`year`、`type`、`title`，再把它加入 `portfolio.json` 對應分類的 `projects` 陣列。
5. 啟動本機預覽：

   ```bash
   python3 -m http.server 8765
   ```

6. 開啟 `http://localhost:8765/`，檢查電腦版、手機版、深色模式、淺色模式，以及圖片放大功能。

圖片輸出預設值如下：

- 大圖最長邊 1600px，WebP 品質 85。
- 活動紀錄縮圖最長邊 720px，WebP 品質 78。
- 原始照片不會被修改。
- 如果預計輸出的檔名已存在，腳本會停止，避免意外覆寫。

可先預演而不產生檔案：

```bash
python3 scripts/process_images.py incoming/新作品 event --dry-run
```

確認需要覆寫既有圖片時才使用：

```bash
python3 scripts/process_images.py incoming/新作品 event --start 57 --overwrite
```

若非活動分類也需要縮圖，可加上 `--thumbnails`；不想為活動分類建立縮圖時，可加上 `--no-thumbnails`。

## `portfolio.json` 照片欄位

一組照片作品的基本格式：

```json
{
  "id": "project-slug",
  "year": "2026",
  "type": "活動紀錄",
  "title": "顯示在頁面上的作品名稱",
  "start": 57,
  "count": 8
}
```

- `id`：不重複的英文代號，使用小寫字母、數字與連字號。
- `year`：拍攝年份；沒有年份時可省略。
- `type`：作品類型；沒有年份時也可改用 `meta` 填入完整分類文字。
- `title`：頁面顯示的名稱，也會用於圖片替代文字。
- `galleryLabel`：選填。只有圖片替代文字需要較短名稱時才加入。
- `start`：這組作品的第一張圖片編號。
- `count`：這組作品的圖片總數。

頁面順序就是 `projects` 陣列的順序。若要把新作品放在最上方，把整筆資料移到陣列最前面即可；圖片編號不需要跟著更改。

## 新增影片作品

在 `portfolio.json` 的 `video.videos` 陣列加入：

```json
{
  "youtubeId": "影片網址中的 ID",
  "title": "影片標題"
}
```

例如 `https://www.youtube.com/watch?v=AWyDeMMhLkU` 的 YouTube ID 是 `AWyDeMMhLkU`。影片會依陣列順序顯示。

## 發布前檢查

```bash
python3 -m json.tool portfolio.json > /dev/null
git status --short
```

接著確認：

- 每張圖片都能顯示並放大。
- 作品名稱、年份、分類與照片順序正確。
- 活動紀錄的縮圖與大圖數量相同。
- 手機版可順暢上下滑動，輪播可左右滑動。
- 沒有把 `incoming/` 的原始大檔提交到網站。
