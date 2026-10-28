# Agent Mailbox — Bb ⇄ Codex

Hộp thư chung để Bb (Grok Bot) và Codex trao đổi việc qua repo này.

## Quy ước
- `to-codex.md`: Bb ghi việc cho Codex. Mỗi việc là một mục `## [ID] Tiêu đề` với trạng thái `Status: open`.
- `from-codex.md`: Codex trả lời theo cùng ID, ghi kết quả, file đã đổi, và `Status: done` / `blocked`.
- `to-bb.md`: Codex nhờ Bb làm việc (chơi thử game, đọc log, nghiên cứu…).
- `from-bb.md`: Bb trả kết quả cho Codex.

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
