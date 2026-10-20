---
id: l0-percentiles
title: "p50, p95, p99: đo độ chậm cho người kém may mắn"
---

## Mục tiêu
Đọc được p50, p95, p99 của một lần chạy, chỉ ra khi nào "con số điển hình" che mất người dùng chậm,
và chọn cấu hình để 99% yêu cầu dưới 50 ms dù có một đợt dồn ngắn.

## Hình dung trước
Tuyến xe buýt số 8 "trung bình trễ 3 phút". Nhưng sáng thứ Hai trời mưa, chuyến 7 giờ trễ 40 phút.
Người đi làm không nhớ con số trung bình; họ nhớ buổi sáng thứ Hai đó. Với một trang web có một
triệu lượt truy cập mỗi ngày, "1% chậm" là mười nghìn lượt.

## Thuật ngữ
- **Percentile** (bách phân vị): xếp mọi yêu cầu từ nhanh đến chậm. **p50** (trung vị): một nửa
  nhanh hơn số này. **p95**: 95% nhanh hơn, 5% chậm hơn. **p99**: chỉ 1 trên 100 yêu cầu chậm hơn.
- **Tail latency** (độ trễ phần đuôi): độ trễ của những yêu cầu chậm nhất (p95, p99 trở lên).
- **Average / mean** (trung bình cộng): tổng thời gian chia số yêu cầu. Nó bị kéo bởi số đông nên
  dễ che phần đuôi.
- **Burst** (đợt dồn): một khoảng ngắn lưu lượng tăng vọt.
- **SLI / SLO** (chỉ số / mục tiêu mức dịch vụ): SLI là thứ đo (ví dụ p99); SLO là mục tiêu
  (p99 ≤ 300 ms).

## Hiểu lầm thường gặp
- **M1**: "p50 tốt thì hệ thống tốt." p50 chỉ nói về người ở giữa.
- **M2**: "1% chậm là vài người xui, kệ họ." Ở quy mô lớn đó là rất nhiều người, và một trang gọi
  nhiều dịch vụ sẽ gặp phần đuôi thường xuyên.
- **M3**: "Thêm RAM sẽ hấp thụ đợt dồn." RAM cho hàng chờ dài hơn, không làm hàng chạy nhanh hơn.

## Thí nghiệm
**Bối cảnh:** 6.000 yêu cầu/giây; ở giây thứ 4, lưu lượng gấp đôi trong 0,4 giây. Máy 1 vCPU, 2 GB.
Bạn chỉnh số vCPU (1, 2) và RAM (2, 8 GB).

**Dự đoán trước khi chạy:** sau đợt dồn, con số nào nhảy nhiều nhất: p50, p95 hay p99? *(p99.)*

**Mục tiêu:** `p50 ≤ 10 ms` và `p99 ≤ 50 ms`.

| Lựa chọn | vCPU | RAM | p50 | p95 | p99 | Kết quả |
|---|---|---|---|---|---|---|
| A | 2 | 2 GB | khoảng 5 ms | khoảng 5 ms | khoảng 5 ms | đạt cả hai mục tiêu |
| B | 1 | 2 GB | khoảng 5 ms | khoảng 83 ms | khoảng 129 ms | p50 ổn, p99 trượt |
| C | 1 | 8 GB | khoảng 5 ms | khoảng 83 ms | khoảng 129 ms | y hệt B |

Kéo thanh thời gian ở lựa chọn B đến giây 4–5: hàng đợi phình lên trong lúc dồn và cần gần nửa
giây nữa để xả hết. Những yêu cầu đến trong khoảng đó chính là phần đuôi.

## Phản hồi
- **B**: Nhìn p50 thì mọi thứ ổn, vì hơn 90% thời gian máy chạy êm. Nhưng trong đợt dồn, 1 vCPU
  nhận 12.000 yêu cầu/giây trong khi chỉ xử lý được 9.000; hàng đợi dài ra và vài phần trăm yêu cầu
  phải chờ khoảng 100 ms hoặc lâu hơn. Nếu chỉ đặt mục tiêu theo p50, bạn sẽ không bao giờ thấy họ.
- **C**: RAM không phải chỗ nghẽn: hàng đợi chưa bao giờ đầy. Vấn đề là tốc độ xả hàng. Thêm vCPU
  mới làm hàng chạy nhanh hơn.
- **M2**: Một phần trăm nghe rất nhỏ, nhưng một trang web có 10 triệu yêu cầu mỗi ngày sẽ có 100.000
  yêu cầu chậm. Hơn nữa, một trang thường cần nhiều lần gọi: nếu trang gọi 100 lần và mỗi lần có 1%
  khả năng chậm, thì khoảng 63% lượt tải trang dính ít nhất một lần chậm. Phần đuôi trở thành trải
  nghiệm bình thường.

## Điều cần nhớ
- Đặt mục tiêu theo phần đuôi (p95, p99), không theo trung bình hay trung vị.
- Những đợt dồn ngắn tạo ra phần đuôi mà con số trung bình không thấy.
- Sửa phần đuôi thường là thêm tốc độ xử lý hoặc dự phòng, không phải thêm chỗ chờ.

## Câu hỏi ôn tập
1. p95 = 200 ms nghĩa là gì? *(95% yêu cầu nhanh hơn 200 ms; 5% chậm hơn.)*
2. Một trang gọi song song 100 dịch vụ, mỗi dịch vụ chậm 1% thời gian. Khoảng bao nhiêu lượt tải
   trang gặp ít nhất một dịch vụ chậm? *(1 − 0,99^100 ≈ 63%.)*
3. Vì sao trung bình có thể đẹp trong khi người dùng phàn nàn? *(Số đông nhanh kéo trung bình xuống,
   che những yêu cầu rất chậm.)*
