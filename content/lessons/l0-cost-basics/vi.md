---
id: l0-cost-basics
title: Chi phí cũng là một yêu cầu
---

## Mục tiêu
Chọn cấu hình rẻ nhất vẫn đạt mục tiêu tốc độ, và giải thích vì sao "to nhất" và "rẻ nhất" đều là
lựa chọn sai.

## Hình dung trước
Bốn người bạn đi ăn tối. Thuê xe buýt 45 chỗ: ai cũng tới nơi, nhưng bạn trả tiền cho 41 ghế trống.
Đi một chiếc xe máy: rẻ, nhưng ba người ở lại. Một chiếc ô tô bốn chỗ là vừa.

## Thuật ngữ
- **Cost per month** (chi phí mỗi tháng): tổng tiền thuê các thành phần. Trong phòng thí nghiệm,
  1 vCPU máy web giá $22,5/tháng (giá của thế giới mô phỏng).
- **Right-sizing** (chọn cỡ vừa): chọn cấu hình nhỏ nhất đạt yêu cầu với khoảng dự phòng hợp lý.
- **Over-provisioning** (cấp dư): thuê nhiều hơn mức cần, trả tiền cho phần không dùng.
- **Unit cost** (chi phí đơn vị): chi phí cho mỗi nghìn yêu cầu hay mỗi người dùng; giúp so sánh
  thiết kế công bằng.

## Hiểu lầm thường gặp
- **M1**: "Mua máy to nhất cho chắc." Trả gấp bốn để nhanh hơn vài mili giây không ai nhận ra.
- **M2**: "Rẻ nhất chạy được là tốt nhất." Chạy được lúc vắng, sập lúc đông; sự cố còn đắt hơn.
- **M3**: "Dư thêm một ít 'cho chắc' thì không sao." Nếu không có lý do bằng số, đó vẫn là tiền thừa.

## Thí nghiệm
**Bối cảnh:** 12.000 yêu cầu/giây. Bạn đang chạy một máy 8 vCPU ($180/tháng). Sếp hỏi: "Có cần to vậy
không?" Ngân sách mới: $50/tháng.

**Dự đoán:** Cấu hình nhỏ nhất đạt `p95 ≤ 20 ms` là bao nhiêu vCPU?

**Mục tiêu:** `p95 ≤ 20 ms`, `requestsRejected = 0`, `chi phí ≤ $50/tháng`.

| Lựa chọn | vCPU | p95 dự kiến | Chi phí | Kết quả |
|---|---|---|---|---|
| A (đúng) | 2 | khoảng 6,5 ms | $45 | đạt, bận khoảng 67% |
| B | 8 | khoảng 2,9 ms | $180 | ✗ vượt ngân sách |
| C | 1 | khoảng 485 ms, bị từ chối | $22,5 | ✗ quá tải |
| D | 3 | khoảng 4,1 ms | $67,5 | ✗ vượt ngân sách |

## Phản hồi
- **B**: Nhanh hơn A khoảng 3,6 ms — người dùng không thể nhận ra — nhưng đắt gấp bốn. Máy rảnh hơn
  80% thời gian.
- **C**: Rẻ nhất, nhưng 12.000 yêu cầu/giây vượt sức chứa khoảng 9.000 của 1 vCPU. Hàng đợi đầy, yêu
  cầu bị từ chối. Tiết kiệm $22,5 mà mất khách.
- **D**: 3 vCPU không sai về kỹ thuật, nhưng bạn trả thêm $22,5 mỗi tháng cho khoảng 2 ms. Nếu muốn
  thêm dự phòng, hãy nêu lý do bằng số (ví dụ "đỉnh tải có thể gấp 1,5 lần").

## Điều cần nhớ
- Chi phí là một mục tiêu như độ trễ và tính sẵn sàng.
- Chọn cấu hình nhỏ nhất đạt mục tiêu với dự phòng có lý do.
- So sánh thiết kế bằng chi phí đơn vị, không chỉ bằng tổng hóa đơn.

## Câu hỏi ôn tập
1. Hai thiết kế cùng đạt mục tiêu: $45 và $67,5 mỗi tháng. Khi nào nên chọn cái đắt hơn? *(Khi có lý
   do bằng số, ví dụ dự báo tăng tải hoặc cần chịu được mất một máy.)*
2. 12.000 yêu cầu/giây trong một tháng 30 ngày là khoảng bao nhiêu tỉ yêu cầu? Với $45/tháng, mỗi
   triệu yêu cầu tốn bao nhiêu? *(Khoảng 31 tỉ; khoảng $0,0014 mỗi triệu.)*
3. Vì sao máy bận 15% cả ngày là dấu hiệu lãng phí? *(Phần lớn sức chứa trả tiền mà không dùng.)*
