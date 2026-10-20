---
id: l0-client-server
title: "Ai hỏi, ai trả lời: client và server"
---

## Mục tiêu
Sau bài này, bạn chỉ ra được rằng mỗi yêu cầu cần một máy chủ đang chạy ở cuối đường đi, và giải
thích vì sao các hộp ở giữa, hay riêng trình duyệt, không bao giờ tự trả lời ai.

## Hình dung trước
Bạn đứng ở quầy một tiệm bánh mì. Bạn nói "cho một ổ thịt". Cô bán hàng nghe, làm bánh, đưa bánh
cho bạn. Có hai vai rất rõ: **người hỏi** (bạn) và **người trả lời** (cô bán hàng). Nếu bạn đứng nói
với cái tủ kính, hay với ông bảo vệ đứng ở cửa, thì dù bạn nói to đến mấy cũng không ai làm bánh.

## Thuật ngữ
- **Client** (máy khách, bên hỏi): chương trình gửi yêu cầu đi, ví dụ trình duyệt hay ứng dụng
  điện thoại. Trong phòng thí nghiệm, khối `client` đại diện cho cả nghìn người dùng cùng lúc.
- **Server** (máy chủ, bên trả lời): chương trình ngồi chờ yêu cầu và gửi lại câu trả lời.
  "Client" và "server" là **vai**, không phải loại máy: một máy chủ web cũng là client khi nó đi hỏi
  cơ sở dữ liệu.
- **Request** (yêu cầu): một lần hỏi. **Response** (phản hồi): câu trả lời cho lần hỏi đó.
- **Load balancer** (bộ cân bằng tải, khối `lb`): một "người chia việc" đứng giữa, chuyển yêu cầu
  cho các máy chủ phía sau. Bạn sẽ học kỹ ở cấp L1; hôm nay chỉ cần biết nó **không tự trả lời**.
- **Availability** (tỉ lệ sẵn sàng): phần trăm yêu cầu nhận được câu trả lời thành công.

## Hiểu lầm thường gặp
- **M1**: "Chỉ cần có một cái hộp ở giữa trên Internet là có người trả lời." Thật ra hộp ở giữa chỉ
  chuyển tiếp; phải có máy chủ phía sau.
- **M2**: "Máy chủ cứ bật lên là người dùng tự tìm tới." Phải có đường đi (địa chỉ, kết nối) từ
  client đến server.
- **M3**: "Trang web nằm sẵn trong trình duyệt của tôi." Trình duyệt chỉ hiển thị những gì máy chủ
  gửi về.

## Thí nghiệm
**Bối cảnh:** người dùng gửi 500 yêu cầu mỗi giây. Yêu cầu đi tới một bộ cân bằng tải (`lb`), phía
sau là một máy chủ web (`web`). Bạn có hai công tắc:

- **Máy chủ web**: chạy suốt lần chạy, hoặc bị tắt ngay từ giây đầu tiên.
- **Số bản bộ cân bằng tải**: 1 hoặc 2.

**Dự đoán trước khi chạy:** máy chủ web đã tắt, nhưng bạn có tới hai bộ cân bằng tải. Bao nhiêu phần
trăm yêu cầu được trả lời: 0%, 50% hay 100%? *(0%.)*

**Mục tiêu:** tỉ lệ sẵn sàng ít nhất 99%, và không yêu cầu nào "unreachable" (không tới được nơi trả
lời: trên đường đi của nó không còn ai có thể trả lời).

| Lựa chọn | Máy chủ web | Số bản LB | Phòng thí nghiệm cho thấy |
|---|---|---|---|
| A | đang chạy | 1 | sẵn sàng 100%, p95 khoảng 7 ms |
| B | tắt | 2 | sẵn sàng 0%, mọi yêu cầu đều unreachable |
| C | tắt | 1 | sẵn sàng 0%, mọi yêu cầu đều unreachable |

Mở **Follow request** ở lựa chọn A: mỗi yêu cầu đi người dùng → `lb` → `web`, rồi câu trả lời quay
về theo đường cũ. Ở B và C, dấu vết dừng lại ở `lb`.

## Phản hồi
- **B**: Thêm một bộ cân bằng tải là thêm một người chia việc, không phải thêm một người làm bánh. Cả
  hai đều nhận yêu cầu rồi đi tìm máy chủ để chuyển, không thấy ai, và yêu cầu rơi vào khoảng trống.
  Thêm hộp ở giữa không bao giờ tự sinh ra câu trả lời.
- **C**: Trình duyệt không chứa sẵn trang web; nó chỉ hiển thị những gì máy chủ gửi về. Máy chủ web
  tắt thì không có gì để gửi, nên người dùng chẳng nhận được gì, dù phía họ cài đặt gì đi nữa.
- **M2**: Một máy chủ đang bật nhưng không có đường nối từ người dùng thì với họ nó như không tồn
  tại. Ngoài đời, đó là lúc thiếu địa chỉ hoặc kết nối bị chặn. Trong phòng thí nghiệm, thử xóa cạnh
  nối người dùng với `lb`: phòng thí nghiệm từ chối chạy và báo `client.no-path`, vì không yêu cầu
  nào có thể tới được ai.

## Điều cần nhớ
- Mỗi lần dùng web là một cặp hỏi–đáp giữa client và server.
- Client và server là vai trò; một chương trình có thể đóng cả hai vai.
- Hộp đứng giữa (như bộ cân bằng tải) chỉ chuyển tiếp; luôn cần một máy chủ thật sự trả lời.

## Câu hỏi ôn tập
1. Khi máy chủ web gửi câu hỏi tới cơ sở dữ liệu, máy chủ web đang đóng vai gì? *(Client.)*
2. Vì sao nối người dùng vào một bộ cân bằng tải trống cho tỉ lệ sẵn sàng 0%? *(Nó không có ai để
   chuyển yêu cầu tới; nó không tự trả lời.)*
3. Kể hai ví dụ về client trong đời thường. *(Trình duyệt, ứng dụng ngân hàng trên điện thoại, một
   script tải dữ liệu…)*
4. "Availability 99%" nghĩa là gì nếu có 10.000 yêu cầu? *(Khoảng 9.900 được trả lời thành công.)*
