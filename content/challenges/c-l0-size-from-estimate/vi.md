---
id: c-l0-size-from-estimate
title: Từ đề bài đến cấu hình
---

## Bối cảnh
Một ứng dụng đặt vé dự kiến có 26 triệu người dùng mỗi ngày, mỗi người tạo khoảng 10 yêu cầu mỗi
ngày, và giờ cao điểm gấp khoảng hai lần mức trung bình cả ngày. Mỗi yêu cầu gửi một truy vấn xuống
cơ sở dữ liệu PostgreSQL. Lần chạy trong thử thách này chính là giờ cao điểm đó, khoảng 6.000 yêu
cầu mỗi giây. Bạn bắt đầu với một máy web 1 vCPU và một cơ sở dữ liệu chưa có bản sao.

Nhóm muốn có khoảng dự phòng: lúc bận nhất, không khối nào được bận quá 70%, để đỉnh tải lớn hơn
dự báo một chút cũng không gây hại.

- **peak**: ngân sách $600 mỗi tháng.

## Mục tiêu
Đổi đề bài thành số yêu cầu mỗi giây, rồi chọn tầng web và cơ sở dữ liệu sao cho p95 không quá
50 ms, không yêu cầu nào bị từ chối, mọi khối bận không quá 70%, và chi phí trong $600 mỗi tháng.

## Gợi ý
- **h1**: 26.000.000 × 10 ÷ 86.400 cho ra mức trung bình; nhân đôi để có đỉnh. So kết quả với số yêu
  cầu mà một vCPU và một máy cơ sở dữ liệu mỗi thứ xử lý được mỗi giây.
- **h2**: Khối bận nhất quyết định peakBusy. Thiết kế chỉ vừa khít đỉnh trên giấy sẽ bận 85–100% khi
  chạy thật, vì yêu cầu đến dồn thành cụm.
- **h3**: Bản sao đọc của cơ sở dữ liệu chia nhau các lượt đọc. Cần bao nhiêu máy để cơ sở dữ liệu
  bận dưới 70% một cách thoải mái ở mức 6.000 truy vấn mỗi giây?
