---
id: c-l0-exit-coffee-shop
title: "Kiểm tra cuối cấp 0: quán cà phê trực tuyến"
---

## Bối cảnh
Một quán cà phê nhận đặt đồ uống qua mạng rồi khách ghé lấy. Bình thường mỗi giây có khoảng 4.000
yêu cầu, và yêu cầu nào cũng đọc hoặc ghi vào cơ sở dữ liệu PostgreSQL của quán. Đến giây 1,5 thì
giờ cao điểm buổi sáng bắt đầu: lưu lượng gấp đôi trong 2 giây. Sau đó sự cố ập đến: giây thứ 5 một
máy web chết, giây thứ 7 primary của cơ sở dữ liệu chết. Bạn bắt đầu với một máy web và một cơ sở dữ
liệu, chưa có bản sao nào.

Đây là bài kiểm tra cuối cấp 0. Nó gom lại sức chứa, hàng đợi, phân vị, nút thắt ở cơ sở dữ liệu,
điểm lỗi đơn và chi phí.

- **standard**: ngân sách $500 mỗi tháng.
- **tight-budget**: cùng lần chạy đó, nhưng chỉ có $420 mỗi tháng.

## Mục tiêu
Ở cả hai chế độ: p95 không quá 50 ms, p99 không quá 100 ms, trả lời được ít nhất 98% yêu cầu, không
còn điểm lỗi đơn nào, và không vượt ngân sách tháng.

## Gợi ý
- **h1**: Ước lượng đỉnh tải trước: lúc cao điểm mỗi giây có bao nhiêu yêu cầu, tức là bao nhiêu truy
  vấn xuống cơ sở dữ liệu? Khối nào chạm giới hạn trước?
- **h2**: Liệt kê từng khối và hỏi: nếu nó chết thì sao? Hai bản của một thứ chỉ có ích khi bản còn
  lại tự gánh nổi toàn bộ tải.
- **h3**: Một máy to hơn vẫn là điểm lỗi đơn. Trước khi mua thêm, hãy xem thiết kế dự phòng rẻ nhất
  đã đạt mục tiêu tốc độ hay chưa.
