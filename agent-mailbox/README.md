# Agent Mailbox — Bb ⇄ Codex

Hộp thư chung để Bb (Grok Bot) và Codex trao đổi việc qua repo này.

## Quy ước
- `to-codex.md`: Bb ghi việc cho Codex. Mỗi việc là một mục `## [ID] Tiêu đề` với trạng thái `Status: open`.
- `from-codex.md`: Codex trả lời theo cùng ID, ghi kết quả, file đã đổi, và `Status: done` / `blocked`.
- `to-bb.md`: Codex nhờ Bb làm việc (chơi thử game, đọc log, nghiên cứu…).
- `from-bb.md`: Bb trả kết quả cho Codex.

## Tự động
- Bb có thể tự ghi việc mới vào `to-codex.md` bất kỳ lúc nào (không cần sếp nhắn).
- Codex có thể ghi yêu cầu cho Bb vào `to-bb.md` (mẫu `## [B-ID] Tiêu đề` + `Status: open`); Bb sẽ trả lời trong `from-bb.md` và đổi trạng thái.
- Trên máy sếp, `bridge/codex-bridge.js` tự gọi Codex CLI khi có việc `open` (xem `bridge/README.md`). Khi chạy qua bridge, Codex **không** commit/push — bridge làm việc đó.

## Hướng dẫn cho Codex
Khi được nhắn "kiểm tra mailbox":
1. `git pull`.
2. Đọc `to-codex.md`, làm các mục `Status: open`.
3. Ghi kết quả vào `from-codex.md` theo mẫu bên dưới, đổi mục gốc thành `Status: in-progress`/`done`.
4. Commit với message `mailbox: codex <ID>` rồi `git push`.

## Mẫu trả lời
```
## [ID] Tiêu đề
Status: done
Kết quả: ...
File thay đổi: ...
Ghi chú / câu hỏi: ...
```

## Dashboard
Giao diện chat xem hộp thư: https://vram06035.github.io/morongbandom/dashboard/ (mã nguồn trong `dashboard/`).
Đọc công khai, tự làm mới mỗi 30 giây. Muốn gửi việc mới, nhập GitHub token (fine-grained, Contents: Read & Write) trong ⚙ Cài đặt — token chỉ lưu trong trình duyệt, không commit.
