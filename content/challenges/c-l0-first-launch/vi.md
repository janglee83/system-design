---
id: c-l0-first-launch
title: Mở bán cửa hàng nhỏ
---

## Bối cảnh
Một tiệm bánh gia đình sắp mở cửa hàng trực tuyến. Giờ trưa, mỗi giây có khoảng 3.000 yêu cầu: khách
xem bánh và một số người đặt hàng. Đơn hàng phải được lưu lại, nên cửa hàng cần một máy chủ web để
trả lời và một cơ sở dữ liệu PostgreSQL để giữ đơn. Lúc đầu trên bảng chỉ có người dùng; bạn tự dựng
phần còn lại bằng máy chủ web và cơ sở dữ liệu.

Thử thách có ba chế độ:

- **standard**: một buổi trưa bình thường, ngân sách $300 mỗi tháng.
- **tight-budget**: vẫn buổi trưa đó, nhưng chủ tiệm chỉ chi được $210 mỗi tháng.
- **chaos**: ngân sách $500 mỗi tháng, và trong lúc chạy một máy web chết ở giây thứ 3, primary của
  cơ sở dữ liệu chết ở giây thứ 6.

## Mục tiêu
Ở mọi chế độ: p95 không quá 50 ms, không từ chối yêu cầu nào, trả lời được ít nhất 98% yêu cầu, và
không vượt ngân sách tháng của chế độ đó.

## Gợi ý
- **h1**: Tính xem một máy web và một cơ sở dữ liệu mỗi thứ chịu được bao nhiêu yêu cầu mỗi giây, rồi
  so với 3.000. Có thành phần nào sát giới hạn không?
- **h2**: Ở hai chế độ đầu, thiết kế rẻ nhất mà vẫn đạt mục tiêu tốc độ thường là đáp án đúng. Mỗi
  vCPU thêm vào làm hóa đơn tăng bao nhiêu?
- **h3**: Ở chế độ chaos, hỏi từng khối: "nếu khối này chết, có bản nào khác gánh tiếp không?" Nhớ
  rằng cơ sở dữ liệu cần một bản sao để có thể nâng lên làm primary.
