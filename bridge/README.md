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
- Codex chạy với `codex exec --sandbox workspace-write -` (đã đối chiếu với CLI 0.159.3; cờ cũ `--full-auto` không còn được hỗ trợ). Prompt truyền qua stdin; trên Windows gọi `codex.cmd` qua shell với đối số cố định. Sandbox cho phép sửa file trong workspace; lệnh cần quyền ngoài sandbox có thể không chạy được trong chế độ không tương tác.
- Đừng sửa tay file trong repo khi bridge đang chạy; nếu có thay đổi chưa commit, bridge sẽ bỏ qua vòng đó.
- Chỉ chạy **một** bridge cho mỗi bản clone (có file khoá chống chạy trùng).
- Nếu Codex không đổi trạng thái việc, bridge tự đánh dấu `blocked`.
