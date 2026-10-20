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
  máy web 1 vCPU giá $22,5/tháng, mỗi vCPU thêm
  $27,5 (2 vCPU là $50, 3 vCPU là $77,5, 8 vCPU là $215). Đây là giá của thế giới mô phỏng.
- **Right-sizing** (chọn cỡ vừa): chọn cấu hình nhỏ nhất đạt yêu cầu với khoảng dự phòng hợp lý.
- **Over-provisioning** (cấp dư): thuê nhiều hơn mức cần, trả tiền cho phần không dùng.
- **Unit cost** (chi phí đơn vị): chi phí cho mỗi nghìn yêu cầu hay mỗi người dùng; giúp so sánh
  thiết kế công bằng.

## Hiểu lầm thường gặp
- **M1**: "Mua máy to nhất cho chắc." Trả gấp bốn mà người dùng không thấy nhanh hơn chút nào.
- **M2**: "Rẻ nhất chạy được là tốt nhất." Chạy được lúc vắng, sập lúc đông; sự cố còn đắt hơn.
- **M3**: "Dư thêm một ít 'cho chắc' thì không sao." Nếu không có lý do bằng số, đó vẫn là tiền thừa.

## Thí nghiệm
**Bối cảnh:** mỗi giây có 10.000 yêu cầu. Bạn đang chạy một máy 8 vCPU ($215/tháng). Sếp hỏi: "Có cần
to vậy không?" Ngân sách mới: $50 mỗi tháng.

**Dự đoán trước khi chạy:** số vCPU nhỏ nhất vẫn giữ p95 không quá 20 ms và không từ chối yêu cầu
nào là bao nhiêu? *(2 vCPU: khoảng 18.000 rps, dư sức cho 10.000.)*

**Mục tiêu:** p95 không quá 20 ms, không yêu cầu nào bị từ chối, chi phí không quá $50 mỗi tháng.

| Lựa chọn | vCPU | p95 | Lúc bận nhất | Chi phí | Chuyện gì xảy ra |
|---|---|---|---|---|---|
| A | 2 | khoảng 5 ms | khoảng 75% | $50 | đạt mọi mục tiêu |
| B | 8 | khoảng 5 ms | khoảng 19% | $215 | vượt ngân sách |
| C | 1 | gần 1 giây | 100% | $22,5 | quá tải, khoảng 1.400 yêu cầu bị từ chối |
| D | 3 | khoảng 5 ms | khoảng 50% | $77,5 | vượt ngân sách |

## Phản hồi
- **B**: p95 y hệt A, vì một yêu cầu không thể xong nhanh hơn thời gian xử lý của chính nó. Bạn trả
  gấp hơn bốn lần cho một máy rảnh hơn 80% thời gian.
- **C**: Rẻ nhất, nhưng 10.000 yêu cầu mỗi giây vượt sức chứa khoảng 9.000 của 1 vCPU. Hàng đợi đầy
  dần và yêu cầu bị từ chối. Tiết kiệm được $27,5 mà mất khách.
- **D**: 3 vCPU không sai về kỹ thuật, nhưng bạn trả thêm $27,5 mỗi tháng mà người dùng không nhận
  được gì: p95 không đổi. Nếu muốn dự phòng thêm, hãy nêu lý do bằng con số (ví dụ "đỉnh tải có thể
  gấp 1,5 lần").

## Điều cần nhớ
- Chi phí là một mục tiêu như độ trễ và tính sẵn sàng.
- Chọn cấu hình nhỏ nhất đạt mục tiêu với dự phòng có lý do.
- So sánh thiết kế bằng chi phí đơn vị, không chỉ bằng tổng hóa đơn.

## Câu hỏi ôn tập
1. Hai thiết kế cùng đạt mục tiêu: $50 và $77,5 mỗi tháng. Khi nào nên chọn cái đắt hơn? *(Khi có lý
   do bằng số, ví dụ dự báo tăng tải hoặc cần chịu được mất một máy.)*
2. 10.000 yêu cầu/giây trong một tháng 30 ngày là khoảng bao nhiêu tỉ yêu cầu? Với $50/tháng, mỗi
   triệu yêu cầu tốn bao nhiêu? *(Khoảng 26 tỉ; khoảng $0,002 mỗi triệu.)*
3. Vì sao máy bận 15% cả ngày là dấu hiệu lãng phí? *(Phần lớn sức chứa trả tiền mà không dùng.)*
