---
id: l0-queueing-and-utilization
title: "Hàng đợi: vì sao máy chủ bận 94% đã là có chuyện"
---

## Mục tiêu
Chọn cấu hình giữ độ bận dưới 70% để p95 dưới 10 ms trong ngân sách, và giải thích vì sao "không có
lỗi nào" chưa có nghĩa là máy chủ khỏe.

## Hình dung trước
Quầy thu ngân siêu thị: khi cô thu ngân chỉ bận nửa thời gian, bạn hầu như không phải chờ. Khi cô bận
95% thời gian, chỉ cần vài người đến sát nhau là hàng dài ra tận quầy rau. Cô vẫn chưa "quá tải",
chưa đuổi ai về — nhưng ai cũng phải chờ rất lâu.

## Thuật ngữ
- **Utilization** (độ bận, mức sử dụng): phần thời gian máy chủ đang làm việc. Trong phòng thí
  nghiệm là `peakBusy`.
- **Service time** (thời gian phục vụ): thời gian xử lý một yêu cầu khi không phải chờ (ở đây
  2 ms).
- **Queueing delay** (trễ do xếp hàng): thời gian chờ đến lượt.
- **Công thức hàng đợi một quầy:** thời gian phản hồi ≈ thời gian phục vụ ÷ (1 − độ bận). Bận 50% →
  gấp 2; bận 90% → gấp 10; bận 95% → gấp 20.
- **Little's Law** (định luật Little): số yêu cầu đang nằm trong hệ thống = tốc độ đến × thời gian
  mỗi yêu cầu ở lại. Ví dụ 2.000 yêu cầu/giây × 0,05 giây = 100 yêu cầu cùng lúc.
- **Headroom** (khoảng dự phòng): phần sức chứa cố ý để trống cho những lúc dồn dập.

## Hiểu lầm thường gặp
- **M1**: "Máy bận 94% mà không có lỗi nào thì vẫn ổn." Độ trễ đã gấp gần 20 lần thời gian phục
  vụ.
- **M2**: "Độ trễ tăng đều theo độ bận." Nó tăng theo đường cong dốc đứng gần 100% (thảo luận bằng
  biểu đồ; không có lựa chọn riêng).
- **M3**: "Khoảng dự phòng càng nhiều càng tốt." Máy rảnh 76% thời gian là tiền bỏ không.

## Thí nghiệm
**Bối cảnh:** 8.500 yêu cầu/giây, máy chủ 1 vCPU (sức chứa khoảng 9.000). Bạn chọn số vCPU: 1, 2
hoặc 4. Ngân sách $50/tháng.

**Dự đoán:** Với 1 vCPU, có yêu cầu nào bị từ chối không? p95 sẽ khoảng 3 ms, 10 ms hay 35 ms?

**Mục tiêu:** `p95 ≤ 10 ms`, `peakBusy ≤ 0,7`, `chi phí ≤ $50/tháng`.

| Lựa chọn | vCPU | Độ bận | p95 dự kiến | Chi phí | Kết quả |
|---|---|---|---|---|---|
| A (đúng) | 2 | khoảng 47% | khoảng 4,3 ms | $45 | đạt |
| B | 1 | khoảng 94% | khoảng 36 ms, 0 lỗi | $22,5 | ✗ chậm, không có dự phòng |
| C | 4 | khoảng 24% | khoảng 3,1 ms | $90 | ✗ vượt ngân sách |

Sau khi chạy, mở biểu đồ "độ trễ theo độ bận" của bài: ba điểm A, B, C nằm trên cùng một đường cong.

## Phản hồi
- **B**: Không yêu cầu nào bị từ chối, nhưng mỗi yêu cầu chờ gần 20 lần thời gian xử lý thật. Ở độ
  bận 94%, chỉ một đợt tăng nhẹ là hàng đợi bắt đầu phình. "Không lỗi" chỉ nghĩa là chưa vỡ.
- **C**: p95 có tốt hơn A một chút (khoảng 1 ms), nhưng bạn trả gấp đôi để máy rảnh ba phần tư thời
  gian. Dự phòng cần đủ, không cần tối đa.

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
