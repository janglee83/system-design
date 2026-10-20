---
id: l0-http-basics
title: "HTTP: ngôn ngữ chung của web"
---

## Mục tiêu
Đọc một yêu cầu và một phản hồi HTTP đơn giản, rồi nói được: nó muốn làm gì (phương thức), nó nhắm
vào đâu (đường dẫn), và kết quả ra sao (mã trạng thái).

## Hình dung trước
Gửi hàng ở bưu cục, bạn điền một tờ phiếu theo mẫu: gửi hay nhận, đến địa chỉ nào, bên trong có gì.
Bưu cục trả lại một biên nhận cũng theo mẫu: "đã nhận", "sai địa chỉ", "hôm nay bưu cục quá tải". Vì
ai cũng dùng chung một mẫu nên bưu cục nào cũng hiểu khách nào. **HTTP** chính là "mẫu phiếu" chung
giữa client và server trên web.

## Thuật ngữ
- **HTTP** (HyperText Transfer Protocol, giao thức truyền siêu văn bản): quy ước về cách viết yêu
  cầu và phản hồi trên web.
- **Method** (phương thức): động từ của yêu cầu. `GET` là lấy về; `POST` là gửi một thứ mới lên;
  `PUT` là thay thế; `DELETE` là xóa.
- **Path** (đường dẫn): thứ bạn muốn, ví dụ `/menu/banh-mi`.
- **Header** (tiêu đề): các dòng thông tin phụ, ví dụ ngôn ngữ mong muốn hay cookie.
- **Body** (thân): nội dung chính, ví dụ một trang HTML hoặc chi tiết đơn hàng.
- **Status code** (mã trạng thái): con số tóm tắt kết quả. 2xx là thành công; 3xx là "hãy tìm ở chỗ
  khác"; 4xx là phía client làm sai; 5xx là phía server gặp sự cố.
- **Stateless** (phi trạng thái): HTTP không tự nhớ các lần hỏi trước. Muốn "nhớ" (bạn đã đăng
  nhập, giỏ hàng có gì), client phải gửi kèm một dấu hiệu như **cookie** (mẩu dữ liệu nhỏ trình duyệt
  giữ lại và gửi kèm), rồi server tra thông tin trong nơi lưu trữ của nó.
- **Safe** (an toàn): phương thức không được làm thay đổi gì trên server (`GET`). **Idempotent**
  (lũy đẳng): gửi một lần hay hai lần thì kết quả như nhau (`GET`, `PUT`, `DELETE`). `POST` thì
  không: gửi hai lần có thể tạo ra hai đơn hàng.

## Hiểu lầm thường gặp
- **M1**: "HTTP nhớ tôi là ai." Không; việc ghi nhớ nằm ở cookie và ở server.
- **M2**: "Mã 404 nghĩa là máy chủ hỏng." 4xx là yêu cầu bị sai, ví dụ sai đường dẫn. Máy chủ gặp
  sự cố sẽ trả mã 5xx.
- **M3**: "Bấm 'Đặt hàng' hai lần thì cũng chỉ ra một đơn." Chỉ đúng khi hệ thống được thiết kế lũy
  đẳng, điều bạn sẽ học ở cấp L3.

## Bước 1: quan sát
Một yêu cầu (ví dụ do chúng tôi tự viết):

```
GET /menu/banh-mi HTTP/1.1
Host: quan-cua-ban.example
Accept-Language: vi
```

Và phản hồi:

```
HTTP/1.1 200 OK
Content-Type: text/html

<html>…thực đơn bánh mì…</html>
```

## Bước 2: phân tích
- Dòng đầu của yêu cầu có ba phần: phương thức (`GET`), đường dẫn và phiên bản giao thức.
- Dòng đầu của phản hồi có mã trạng thái `200` và chữ `OK`.
- Trước khi gửi, client phải mở một kết nối TCP, tốn một vòng đi về. Nếu kết nối được giữ lại
  (keep-alive), yêu cầu sau không phải trả lại khoản đó.

## Bước 3: áp dụng
Trong phòng thí nghiệm, tham số `writeRatio` chia yêu cầu thành **đọc** (giống `GET`) và **ghi**
(giống `POST`, `PUT` hay `DELETE`). Mở bài lab đi kèm, đổi `writeRatio` từ 0,2 lên 0,8 và xem bảng
chia theo loại yêu cầu thay đổi ra sao. Bước này không tính điểm.

## Câu hỏi
Đạt khi trả lời đúng 4 trên 5 câu.

- **q1**: `DELETE /gio-hang/muc/7` yêu cầu server làm gì?
- **q1.a**: Xóa món số 7 khỏi giỏ hàng.
- **q1.b**: Hiển thị món số 7.
- **q1.c**: Thêm 7 món nữa vào giỏ.
- **q2**: Server trả về `503`. Vấn đề nằm ở đâu?
- **q2.a**: Client gõ sai địa chỉ.
- **q2.b**: Không có vấn đề gì, yêu cầu đã thành công.
- **q2.c**: Ở phía server, vì đây là mã nhóm 5xx.
- **q3**: Server trả `404` cho `/menu/banh-my`. Nhiều khả năng chuyện gì đã xảy ra?
- **q3.a**: Server bị sập.
- **q3.b**: Đường dẫn bị gõ sai nên tài nguyên đó không tồn tại.
- **q3.c**: Bạn phải đăng nhập trước.
- **q4**: Khi mạng chập chờn, vì sao gửi lại `GET` thường không sao, còn gửi lại `POST /don-hang`
  thì rủi ro?
- **q4.a**: `GET` không thay đổi gì và lặp lại vẫn cho kết quả như cũ; `POST` lặp lại có thể tạo
  thêm một đơn.
- **q4.b**: Yêu cầu `POST` chậm hơn yêu cầu `GET`.
- **q4.c**: Server tự động bỏ qua `POST` bị gửi lặp.
- **q5**: HTTP phi trạng thái. Vậy làm sao trang web biết bạn đã đăng nhập?
- **q5.a**: HTTP giữ mọi kết nối mở mãi mãi nên nhớ được bạn.
- **q5.b**: Chỉ cần địa chỉ IP là nhận ra bạn.
- **q5.c**: Trình duyệt gửi cookie chứa mã phiên, và server tra mã đó.

## Phản hồi
- **q3**: Mã 4xx báo rằng chính yêu cầu bị sai; ở đây đường dẫn viết sai một chữ. Server vẫn khỏe:
  nó hiểu yêu cầu đủ rõ để trả lời "không có trang này". Server hỏng thì sẽ trả mã 5xx.
- **q4**: Server không tự bỏ qua yêu cầu lặp. `GET` chỉ đọc nên làm hai lần cũng vô hại; `POST` tạo
  ra một thứ mới nên làm hai lần có thể thành hai đơn hàng, trừ khi hệ thống được thiết kế để nhận ra
  bản trùng.
- **q5**: HTTP quên mỗi yêu cầu ngay sau khi trả lời xong. Trí nhớ nằm trong cookie mà trình duyệt
  gửi kèm mỗi yêu cầu, cùng với dữ liệu phiên mà server giữ. Kết nối thì đóng lại, còn địa chỉ IP có
  thể dùng chung hoặc thay đổi, nên không cái nào nhận diện được bạn.

## Điều cần nhớ
- Một yêu cầu HTTP gồm phương thức + đường dẫn + header (+ body); một phản hồi gồm mã trạng thái +
  header (+ body).
- 4xx là client sai; 5xx là server gặp sự cố.
- HTTP không nhớ gì; cookie và server lo việc ghi nhớ.

## Câu hỏi ôn tập
1. Kể bốn phương thức HTTP và việc mỗi cái làm.
2. Nhóm mã trạng thái 3xx nghĩa là gì?
3. "Lũy đẳng" là gì? Cho ví dụ một phương thức lũy đẳng.
