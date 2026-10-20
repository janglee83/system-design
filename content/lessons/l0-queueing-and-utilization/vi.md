---
id: l0-queueing-and-utilization
title: "Hàng đợi: vì sao máy chủ bận 98% đã là có chuyện"
---

## Mục tiêu
Chọn cấu hình mà lúc bận nhất vẫn dưới 75%, để p95 dưới 8 ms trong ngân sách, và giải thích vì sao
"không có lỗi nào" chưa có nghĩa là máy chủ khỏe.

## Hình dung trước
Quầy thu ngân siêu thị: khi cô thu ngân chỉ bận nửa thời gian, bạn hầu như không phải chờ. Khi cô bận
95% thời gian, chỉ cần vài người đến sát nhau là hàng dài ra tận quầy rau. Cô vẫn chưa "quá tải",
chưa đuổi ai về — nhưng ai cũng phải chờ rất lâu.

## Thuật ngữ
- **Utilization** (độ bận, mức sử dụng): phần thời gian máy chủ đang làm việc. Trong phòng thí
  nghiệm là `peakBusy`.
- **Service time** (thời gian phục vụ): thời gian xử lý một yêu cầu khi không phải chờ (máy chủ web
  trong phòng thí nghiệm mất 4 ms).
- **Queueing delay** (trễ do xếp hàng): thời gian chờ đến lượt.
- **Công thức hàng đợi một quầy:** thời gian phản hồi ≈ thời gian phục vụ ÷ (1 − độ bận). Bận 50% →
  gấp 2; bận 90% → gấp 10; bận 95% → gấp 20.
  Đây là quy tắc sách giáo khoa cho một hàng đợi đơn giản. Máy chủ web trong phòng thí nghiệm tăng
  chậm hơn một chút, nhưng hình dạng vẫn vậy: phẳng rất lâu, rồi dựng đứng khi gần 100%.
- **Little's Law** (định luật Little): số yêu cầu đang nằm trong hệ thống = tốc độ đến × thời gian
  mỗi yêu cầu ở lại. Ví dụ 2.000 yêu cầu/giây × 0,05 giây = 100 yêu cầu cùng lúc.
- **Headroom** (khoảng dự phòng): phần sức chứa cố ý để trống cho những lúc dồn dập.

## Hiểu lầm thường gặp
- **M1**: "Máy bận 98% mà không có lỗi nào thì vẫn ổn." Mỗi yêu cầu đã phải chờ lâu hơn cả thời gian
  xử lý của chính nó, và chỉ một đợt tăng nhỏ là hàng dài ra.
- **M2**: "Độ trễ tăng đều theo độ bận." Nó gần như đứng yên rất lâu, rồi vọt lên khi gần 100%.
- **M3**: "Khoảng dự phòng càng nhiều càng tốt." Máy rảnh hai phần ba thời gian là tiền bỏ không.

## Thí nghiệm
**Bối cảnh:** mỗi giây có 8.800 yêu cầu đến một máy chủ 1 vCPU, sức chứa khoảng 9.000. Bạn chọn 1, 2
hoặc 4 vCPU. Ngân sách là $50 mỗi tháng.

**Dự đoán trước khi chạy:** với 1 vCPU, có yêu cầu nào bị từ chối không? p95 gần 5 ms, 10 ms hay
50 ms? *(Không yêu cầu nào bị từ chối, và p95 khoảng 11 ms, hơn gấp đôi 4 ms làm việc thật.)*

**Mục tiêu:** p95 không quá 8 ms, lúc bận nhất không quá 75%, và chi phí không quá $50 mỗi tháng.

| Lựa chọn | vCPU | Lúc bận nhất | p95 | Chi phí | Chuyện gì xảy ra |
|---|---|---|---|---|---|
| A | 2 | khoảng 67% | khoảng 5 ms | $50 | đạt mọi mục tiêu |
| B | 1 | 100% | khoảng 11 ms (p99 khoảng 14 ms), không lỗi nào | $22,5 | chậm, không còn dự phòng |
| C | 4 | khoảng 33% | khoảng 5 ms | $105 | vượt ngân sách |

Cùng máy 1 vCPU đó, với các mức tải khác nhau, cho thấy đường cong của M2:

| Yêu cầu mỗi giây | 7.000 | 8.000 | 8.500 | 8.800 | 8.900 |
|---|---|---|---|---|---|
| p95 | khoảng 5 ms | khoảng 5 ms | khoảng 7 ms | khoảng 11 ms | khoảng 15 ms |

Từ 7.000 lên 8.000 gần như không đổi gì; vài trăm yêu cầu mỗi giây cuối cùng làm thời gian chờ tăng
gấp đôi, gấp ba.

## Phản hồi
- **B**: Không yêu cầu nào bị từ chối, nhưng những yêu cầu kém may mắn phải chờ hơn gấp đôi thời gian
  xử lý thật, vì ở mức bận 98%, cứ vài yêu cầu đến sát nhau là phải xếp hàng. "Không lỗi" chỉ có
  nghĩa là "chưa vỡ": lưu lượng tăng thêm vài phần trăm là hàng đợi dài mãi.
- **C**: p95 y hệt A, khoảng 5 ms, vì một yêu cầu không thể xong nhanh hơn 4 ms làm việc của chính
  nó. Bạn trả hơn gấp đôi cho một máy rảnh hai phần ba thời gian. Dự phòng cần đủ, không cần tối đa.
- **M2**: Nhìn bảng thứ hai: 8.000 yêu cầu mỗi giây đầu tiên gần như không tốn thêm thời gian chờ,
  còn 900 yêu cầu tiếp theo làm thời gian chờ tăng gấp ba. Đó là lý do một máy chủ "trông vẫn ổn" ở
  mức 80% có thể chậm đi rất nhanh.

## Điều cần nhớ
- Độ trễ tăng vọt khi độ bận tiến gần 100%; vùng nguy hiểm bắt đầu từ khoảng 70%.
- "Không có lỗi" không có nghĩa là khỏe; hãy nhìn cả độ bận và p95.
- Chọn mức dự phòng có chủ đích, rồi dừng.

## Câu hỏi ôn tập
1. Thời gian phục vụ 2 ms, độ bận 90%. Thời gian phản hồi trung bình khoảng bao nhiêu? *(Khoảng
   20 ms.)*
2. 1.000 yêu cầu/giây, mỗi yêu cầu ở lại 0,2 giây. Có bao nhiêu yêu cầu cùng lúc trong hệ thống?
   *(Khoảng 200.)*
3. Vì sao các hệ thống tự co giãn thường đặt mục tiêu khoảng 50% CPU? *(Để còn chỗ cho đợt tăng tải
   và giữ độ trễ thấp.)*
