---
id: l0-dns-and-network-path
title: "Từ tên miền đến máy chủ: DNS và đường đi của request"
---

## Mục tiêu
Kể theo đúng thứ tự những gì diễn ra từ lúc gõ địa chỉ web đến lúc yêu cầu HTTP đầu tiên được gửi
đi, và giải thích vì sao đổi địa chỉ máy chủ thì không phải ai cũng thấy ngay.

## Hình dung trước
Bạn muốn gọi cho bà ngoại. Bạn không thuộc số, chỉ nhớ tên "Bà ngoại" trong danh bạ. Điện thoại tra
danh bạ ra số rồi mới gọi. Nếu bà đã đổi số mà danh bạ của bạn chưa cập nhật, bạn sẽ còn gọi vào số
cũ một thời gian.

## Thuật ngữ
- **IP address** (địa chỉ IP): "số điện thoại" của một máy trên mạng, ví dụ `192.0.2.10`.
- **Domain name** (tên miền): cái tên dễ nhớ như `quan-cua-ban.example`. Đọc từ phải sang trái:
  `example` là tên miền cấp cao nhất (**TLD**, top-level domain), rồi mới đến tên của bạn.
- **DNS** (Domain Name System, hệ thống tên miền): "danh bạ" dùng chung, trải khắp Internet, đổi tên
  miền thành địa chỉ IP.
- **Recursive resolver** (máy phân giải đệ quy): máy chủ đi hỏi giúp bạn, thường do nhà mạng vận
  hành.
- **Authoritative nameserver** (máy chủ tên có thẩm quyền): nơi giữ câu trả lời chính thức cho một
  tên miền.
- **TTL** (time to live, thời gian sống): số giây một câu trả lời DNS được giữ trong bộ nhớ tạm
  trước khi phải hỏi lại.
- **TCP handshake** (bắt tay TCP): ba gói tin nhỏ để mở kết nối, tốn một vòng đi về trước khi dữ
  liệu được gửi.

## Hiểu lầm thường gặp
- **M1**: "Gõ địa chỉ là đi thẳng tới máy chủ." Thật ra có thể phải tra cứu vài lần trước đó.
- **M2**: "Đổi DNS là mọi người thấy ngay." Các câu trả lời đã lưu tạm vẫn được dùng cho đến khi hết
  TTL.
- **M3**: "Một tên miền là một máy chủ." Một tên có thể trỏ tới nhiều địa chỉ, hoặc tới một bộ cân
  bằng tải.

## Bước 1: quan sát hành trình
1. Trình duyệt xem trong bộ nhớ tạm của chính nó và của hệ điều hành.
2. Nếu chưa có, nó hỏi máy phân giải đệ quy.
3. Máy phân giải hỏi máy chủ gốc (root) và được chỉ tới các máy chủ của `.example`.
4. Nó hỏi một máy chủ `.example` và được chỉ tới máy chủ có thẩm quyền của tên miền.
5. Máy chủ có thẩm quyền trả về địa chỉ IP kèm TTL. Tầng nào cũng giữ lại một bản.
6. Trình duyệt mở kết nối TCP (một vòng đi về), thêm TLS nếu là HTTPS, rồi mới gửi yêu cầu HTTP.

## Bước 2: phân tích
- Lần vào trang đầu tiên phải trả cho các bước 2 đến 5 và bước bắt tay; những lần sau thường nhanh
  hơn nhờ bộ nhớ tạm và kết nối được giữ lại.
- TTL là một sự đánh đổi. TTL dài thì ít phải tra lại nhưng đổi địa chỉ lan chậm; TTL ngắn thì ngược
  lại. Một số bộ cân bằng tải trên đám mây dùng TTL 60 giây.
- Phòng thí nghiệm chưa mô phỏng chi phí tra cứu và bắt tay, nên bài này chưa có thí nghiệm.

## Bước 3: áp dụng
Bạn chuyển trang web sang máy chủ mới lúc 9:00, bản ghi DNS cũ có TTL 1 giờ. Đến 9:30 vẫn có người
vào máy chủ cũ. Vì sao, và hôm trước lẽ ra bạn nên làm gì? *(Họ vẫn giữ câu trả lời cũ trong bộ nhớ
tạm. Nên hạ TTL xuống thấp từ trước khi chuyển, và để máy cũ chạy thêm một thời gian sau đó.)*

## Câu hỏi
Đạt khi trả lời đúng 4 trên 5 câu.

- **q1**: DNS đổi cái gì thành cái gì?
- **q1.a**: Trang web thành mã HTML.
- **q1.b**: Tên miền thành địa chỉ IP.
- **q1.c**: Yêu cầu thành phản hồi.
- **q2**: Trong `shop.en.example`, phần nào là TLD?
- **q2.a**: `shop`
- **q2.b**: `en`
- **q2.c**: `example`
- **q3**: Một câu trả lời DNS có TTL là 300. Máy phân giải được dùng lại nó tối đa bao nhiêu phút?
- **q4**: Vì sao lần đầu vào một trang web thường chậm hơn lần thứ hai?
- **q4.a**: Máy chủ phải "khởi động" lại sau mỗi người khách mới.
- **q4.b**: Lần đầu phải tra DNS và bắt tay mở kết nối; lần sau cả hai đã được lưu hoặc dùng lại.
- **q4.c**: Trình duyệt phải tự tải lại chính nó.
- **q5**: Đúng hay sai: một tên miền chỉ trỏ được tới một máy chủ.
- **q5.a**: Đúng.
- **q5.b**: Sai.

## Phản hồi
- **q3**: 300 giây là 5 phút. Trong khoảng đó, bộ nhớ tạm nào đang giữ câu trả lời cũng cứ thế đưa
  nó ra, và đó chính là lý do một thay đổi DNS lan ra từ từ chứ không tức thì.
- **q4**: Trước khi byte HTTP đầu tiên rời trình duyệt, nó có thể phải hỏi qua vài máy chủ để tìm
  địa chỉ rồi mới mở kết nối. Cả hai kết quả đều được giữ lại, nên lần sau bỏ qua được gần hết.
- **q5**: Các trang lớn trả lời một cái tên bằng nhiều địa chỉ, hoặc bằng địa chỉ của một bộ cân bằng
  tải chia yêu cầu cho nhiều máy chủ.

## Điều cần nhớ
- Trước một yêu cầu HTTP thường có một lần tra DNS và một lần bắt tay mở kết nối.
- Bộ nhớ tạm làm mọi thứ nhanh hơn nhưng làm thay đổi lan chậm; TTL quyết định chậm đến mức nào.
- Một cái tên có thể trỏ tới nhiều máy, hoặc tới một bộ cân bằng tải.

## Câu hỏi ôn tập
1. Kể bốn loại máy chủ tham gia vào một lần tra DNS đầy đủ.
2. TTL dài có lợi gì và hại gì?
3. Vì sao bắt tay TCP gây thiệt nhiều hơn cho người dùng ở xa?
