---
id: l0-database-basics
title: "Cơ sở dữ liệu: nơi dữ liệu sống lâu"
---

## Mục tiêu
Giải thích vì sao dữ liệu được giữ trong một cơ sở dữ liệu riêng thay vì trong máy chủ web, và khi
trang web chậm, chỉ ra được cơ sở dữ liệu là nút thắt rồi sửa đúng chỗ.

## Hình dung trước
Một thư viện có nhiều nhân viên đứng quầy đón độc giả (máy chủ web) nhưng chỉ có một thủ thư được
vào kho sách (cơ sở dữ liệu). Mỗi yêu cầu mượn sách đều phải qua thủ thư. Thuê thêm nhân viên quầy
chỉ làm hàng trước cửa kho dài hơn. Và nếu nhân viên quầy ghi sổ mượn trên giấy nháp của riêng mình,
họ nghỉ việc là sổ mất.

## Thuật ngữ
- **Database** (cơ sở dữ liệu): một máy chủ chuyên giữ dữ liệu an toàn và tìm lại nhanh. Ở đây dùng
  **PostgreSQL** (một cơ sở dữ liệu quan hệ phổ biến).
- **Table** (bảng), **row** (dòng), **column** (cột): dữ liệu được xếp thành bảng; mỗi dòng là một
  bản ghi, mỗi cột có tên và kiểu dữ liệu.
- **Query** (truy vấn): một câu hỏi gửi tới cơ sở dữ liệu, thường viết bằng **SQL**.
- **Transaction** (giao dịch): nhóm nhiều bước thay đổi thành "tất cả hoặc không gì cả". Chuyển tiền
  thì trừ tài khoản A và cộng tài khoản B cùng thành công hoặc cùng không xảy ra.
- **Stateless web server** (máy chủ web không giữ trạng thái): máy chủ web có thể bị tắt, khởi động
  lại hoặc nhân bản bất cứ lúc nào, nên không phải nơi cất dữ liệu cần giữ lâu.
- **Bottleneck** (nút thắt cổ chai): thành phần chậm nhất quyết định tốc độ cả hệ thống.

## Hiểu lầm thường gặp
- **M1**: "Dữ liệu an toàn miễn là máy chủ web còn chạy." Máy chủ web là thứ dùng xong bỏ được; dữ
  liệu cần nơi bền vững.
- **M2**: "Trang chậm thì mua máy chủ web mạnh hơn." Nếu cơ sở dữ liệu là nút thắt, không có gì thay
  đổi.
- **M3**: "Chờ lâu hơn một chút thì cơ sở dữ liệu sẽ kịp." Lượng đến vẫn vượt sức chứa; hàng đợi vẫn
  đầy.

## Thí nghiệm
**Bối cảnh:** Người dùng → máy chủ web (2 vCPU) → PostgreSQL. 6.000 yêu cầu/giây, mỗi yêu cầu cần một
truy vấn. Cơ sở dữ liệu cỡ "tiêu chuẩn" chịu khoảng 5.000 truy vấn/giây; cỡ "lớn" chịu khoảng 10.000. Để bài
này chỉ tập trung vào nút thắt, phòng thí nghiệm giữ giá cơ sở dữ liệu như nhau ở cả hai cỡ ($180/tháng).
Ngoài đời, máy lớn gấp đôi thường đắt gần gấp đôi; bài về chi phí sẽ quay lại chuyện này. Bạn chỉnh: vCPU của máy web (2, 4), cỡ cơ sở dữ liệu, thời gian chờ của
client (1 s, 5 s).

**Dự đoán trước khi chạy:** khối nào chuyển đỏ trước: `web` hay `pg`? *(`pg`.)*

**Mục tiêu:** `p95 ≤ 50 ms` và `requestsRejected = 0`.

| Lựa chọn | vCPU web | Cỡ CSDL | Timeout | Kết quả dự kiến |
|---|---|---|---|---|
| A | 2 | lớn | 1 s | p95 khoảng 17 ms, không bị từ chối, $230/tháng |
| B | 4 | tiêu chuẩn | 1 s | p95 gần 600 ms, hơn 7.000 yêu cầu bị từ chối, `pg` quá tải |
| C | 2 | tiêu chuẩn | 5 s | y hệt B: p95 gần 600 ms, vẫn bị từ chối |

Bấm vào khối `pg` ở lựa chọn B: độ bận 100%, hàng đợi đầy. Khối `web` chỉ bận khoảng 17%.

## Phản hồi
- **B**: Máy web vốn đã rảnh; tăng gấp đôi CPU của nó không giúp được gì vì mọi yêu cầu vẫn phải qua
  cơ sở dữ liệu, nơi chỉ xử lý được khoảng 5.000 truy vấn mỗi giây. Hãy tìm khối bận nhất trước khi
  nâng cấp bất cứ thứ gì.
- **C**: Thời gian chờ dài hơn không làm thủ thư làm nhanh hơn. Mỗi giây vẫn dư khoảng 1.000 truy vấn;
  hàng đợi vẫn đầy và vẫn từ chối.
- **M1**: Máy chủ web có thể bị tắt, khởi động lại hoặc thay bằng máy khác bất cứ lúc nào. Thứ gì chỉ
  nằm trong bộ nhớ của nó sẽ mất theo, và các máy web khác cũng không nhìn thấy. Dữ liệu cần sống lâu
  phải nằm trong cơ sở dữ liệu. Thí nghiệm này không có lựa chọn cho hiểu lầm đó; bài về điểm lỗi đơn
  sẽ cho bạn thấy một máy chết thì chuyện gì xảy ra.

## Điều cần nhớ
- Dữ liệu cần giữ lâu sống trong cơ sở dữ liệu, không trong máy chủ web.
- Mọi máy chủ web dùng chung một cơ sở dữ liệu, nên nó thường là nút thắt đầu tiên.
- Trước khi nâng cấp, tìm khối bận nhất; nâng cấp chỗ khác là tiêu tiền vô ích.
- Ở cấp L2 bạn sẽ có thêm công cụ: chỉ mục, bản sao chỉ đọc, cache, phân mảnh.

## Câu hỏi ôn tập
1. Giao dịch đảm bảo điều gì khi chuyển tiền? *(Trừ và cộng cùng xảy ra hoặc cùng không xảy ra.)*
2. Vì sao không nên giữ giỏ hàng trong bộ nhớ của một máy chủ web? *(Máy đó có thể bị tắt hoặc thay;
   dữ liệu sẽ mất, và máy khác không thấy.)*
3. Trong một lần chạy, `web` bận 20%, `pg` bận 100%. Nên nâng cấp gì? *(Cơ sở dữ liệu hoặc giảm tải
   cho nó.)*
4. Stack Overflow năm 2016 chạy khoảng 505 triệu truy vấn SQL cho khoảng 209 triệu yêu cầu HTTP mỗi
   ngày. Trung bình mỗi yêu cầu bao nhiêu truy vấn? *(Khoảng 2,4.)*
