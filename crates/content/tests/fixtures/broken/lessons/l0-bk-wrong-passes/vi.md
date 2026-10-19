---
id: l0-bk-wrong-passes
title: Sức chứa của một máy chủ (bài mẫu)
---

## Mục tiêu
Chọn số vCPU để không yêu cầu nào bị từ chối.

## Hình dung trước
Một quầy chỉ có một người phục vụ.

## Thuật ngữ
- **Capacity** (sức chứa): số yêu cầu tối đa mỗi giây.

## Hiểu lầm thường gặp
- **M1**: Chờ lâu hơn thì hết quá tải.
- **M2**: Vượt sức chứa một chút cũng không sao.

## Thí nghiệm
Thử từng lựa chọn rồi so sánh p95.

## Phản hồi
- **B**: Chờ lâu hơn không làm máy chạy nhanh hơn.
- **C**: Phần dư cộng dồn cho đến khi hàng đợi đầy.

## Điều cần nhớ
- Sức chứa đến từ CPU.
