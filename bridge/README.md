# Codex Bridge — cho Codex tự trả lời mailbox

Script `codex-bridge.js` chạy nền trên máy sếp (Windows / macOS / Linux). Cứ mỗi 60 giây nó `git pull`, tìm việc `Status: open` trong `agent-mailbox/to-codex.md`, gọi Codex CLI xử lý, rồi tự commit và push câu trả lời.

## Cài đặt (một lần)
1. Cài **Node.js 18+**: https://nodejs.org (bản LTS). Kiểm tra: `node -v`.
2. Cài **Git**: https://git-scm.com (Windows: Git for Windows) và đăng nhập GitHub để push được (ví dụ `gh auth login`, hoặc Git Credential Manager).
3. Cài Codex CLI: `npm i -g @openai/codex`
4. Đăng nhập: `codex login` → chọn **Sign in with ChatGPT** (dùng tài khoản ChatGPT của sếp).
5. Clone repo:
   ```
   git clone https://github.com/Vram06035/morongbandom.git
   cd morongbandom
   ```

## Chạy
```
node bridge/codex-bridge.js
```
Tuỳ chọn: `--interval 30` (giây giữa mỗi lần kiểm tra), `--once` (chạy một vòng rồi thoát).

## Dừng
Nhấn **Ctrl+C** trong cửa sổ terminal (hoặc đóng cửa sổ). Nếu script bị tắt đột ngột, lần chạy sau tự dọn file khoá `bridge/.bridge.lock`.

## Lưu ý
- Máy phải **bật và mở terminal chạy script** thì Codex mới trả lời.
- Codex chạy với `--full-auto`: nó được tự sửa file **trong thư mục repo này** mà không hỏi lại. Đừng để file quan trọng khác trong repo nếu không muốn bị sửa.
- Đừng sửa tay file trong repo khi bridge đang chạy; nếu có thay đổi chưa commit, bridge sẽ bỏ qua vòng đó.
- Chỉ chạy **một** bridge cho mỗi bản clone (có file khoá chống chạy trùng).
- Nếu Codex không đổi trạng thái việc, bridge tự đánh dấu `blocked`.
