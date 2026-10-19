---
id: l0-http-basics
level: L0
format: reading+check
minutes: 12
difficulty: 1
prerequisites: [l0-client-server]
research: [content/research/client-server-and-http.md]
engine_readiness: not-needed
engine_gaps: []
status: draft
---

# Check spec (shared)

Reading lesson with three observe/analyse/apply steps and a graded check (≥ 4 of 5 to mark as
done). A small lab link at the end lets the learner change `writeRatio` and see read/write
classes in the run breakdown (no goal, not graded).

---

# Tiếng Việt

## HTTP: ngôn ngữ chung của web

### Mục tiêu
Đọc một yêu cầu và một phản hồi HTTP đơn giản, rồi nói được: nó muốn làm gì (phương thức), nó
nhắm vào đâu (đường dẫn), và kết quả ra sao (mã trạng thái).

### Cần học trước
`l0-client-server`

### Hình dung trước
Gửi hàng ở bưu cục, bạn phải điền một tờ phiếu theo mẫu: gửi hay nhận, đến địa chỉ nào, gói gì
bên trong. Bưu cục trả lại một biên nhận cũng theo mẫu: "đã nhận", "sai địa chỉ", "bưu cục đang
quá tải". Vì ai cũng dùng cùng một mẫu, mọi bưu cục đều hiểu nhau. **HTTP** chính là "mẫu phiếu"
chung giữa client và server trên web.

### Thuật ngữ
- **HTTP** (HyperText Transfer Protocol, giao thức truyền siêu văn bản): quy ước về cách viết yêu
  cầu và phản hồi trên web.
- **Method** (phương thức): động từ của yêu cầu. `GET` = lấy về; `POST` = gửi thứ mới lên;
  `PUT` = thay thế; `DELETE` = xóa.
- **Path** (đường dẫn): thứ bạn muốn, ví dụ `/menu/banh-mi`.
- **Header** (tiêu đề): các dòng thông tin phụ, ví dụ ngôn ngữ mong muốn, cookie.
- **Body** (thân): nội dung chính, ví dụ trang HTML hoặc dữ liệu đơn hàng.
- **Status code** (mã trạng thái): con số tóm tắt kết quả. 2xx = thành công; 3xx = đi chỗ khác;
  4xx = phía client làm sai; 5xx = phía server gặp sự cố.
- **Stateless** (phi trạng thái): HTTP không tự nhớ lần hỏi trước. Muốn "nhớ" (đã đăng nhập, giỏ
  hàng), client phải gửi kèm dấu hiệu như **cookie** (mẩu dữ liệu nhỏ trình duyệt giữ và gửi lại),
  và server tra thông tin ở nơi lưu trữ.
- **Safe** (an toàn): phương thức không được làm thay đổi gì trên server (`GET`).
  **Idempotent** (lũy đẳng): gửi một lần hay hai lần thì hiệu quả như nhau (`GET`, `PUT`,
  `DELETE`). `POST` thì không: gửi hai lần có thể tạo hai đơn hàng.

### Hiểu lầm thường gặp
- "HTTP nhớ tôi là ai." Không; trí nhớ nằm ở cookie và ở server.
- "Mã 404 nghĩa là máy chủ hỏng." Không; 4xx là lỗi phía yêu cầu (ví dụ sai đường dẫn). Hỏng ở
  server là 5xx.
- "Bấm 'Đặt hàng' hai lần thì cũng chỉ một đơn." Chỉ đúng nếu hệ thống được thiết kế lũy đẳng (L3).

### Bước 1 — Quan sát
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

### Bước 2 — Phân tích
- Dòng đầu của yêu cầu có ba phần: phương thức (`GET`), đường dẫn, phiên bản giao thức.
- Dòng đầu của phản hồi có mã trạng thái `200` và chữ `OK`.
- Trước khi gửi, client phải mở một kết nối TCP (cần một vòng đi–về). Nếu kết nối được giữ lại
  (keep-alive), yêu cầu sau không phải trả lại chi phí đó.

### Bước 3 — Áp dụng
Trong phòng thí nghiệm, tham số `writeRatio` chia yêu cầu thành **đọc** (giống `GET`) và **ghi**
(giống `POST/PUT/DELETE`). Hãy mở bài Lab đi kèm, đổi `writeRatio` từ 0,2 lên 0,8 và xem bảng
"theo loại yêu cầu" thay đổi thế nào.

### Kiểm tra (đạt khi đúng 4/5)
1. `DELETE /gio-hang/muc/7` muốn làm gì? *(Xóa món số 7 khỏi giỏ hàng.)*
2. Server trả `503`. Lỗi ở phía nào? *(Server — nhóm 5xx.)*
3. Server trả `404` cho `/menu/banh-my`. Chuyện gì có thể đã xảy ra? *(Client gõ sai đường dẫn;
   tài nguyên không tồn tại.)*
4. Vì sao gửi lại `GET` khi mạng chập chờn thường an toàn còn gửi lại `POST /don-hang` thì không?
   *(GET an toàn và lũy đẳng; POST có thể tạo thêm một đơn.)*
5. HTTP phi trạng thái; vậy làm sao trang web biết bạn đã đăng nhập? *(Trình duyệt gửi cookie chứa
   mã phiên; server tra mã đó trong nơi lưu trữ phiên.)*

### Điều cần nhớ
- Mỗi yêu cầu HTTP = phương thức + đường dẫn + header (+ body); mỗi phản hồi = mã trạng thái +
  header (+ body).
- 4xx là client sai, 5xx là server gặp sự cố.
- HTTP không nhớ gì; cookie và server làm việc ghi nhớ.

### Câu hỏi ôn tập
1. Kể bốn phương thức HTTP và việc mỗi cái làm.
2. Nhóm mã 3xx nghĩa là gì?
3. "Lũy đẳng" là gì? Cho một ví dụ phương thức lũy đẳng.

---

# English

## HTTP: the shared language of the web

### Outcome
Read a simple HTTP request and response and say what it wants to do (method), what it targets
(path) and how it went (status code).

### Prerequisites
`l0-client-server`

### Picture it first
At a post office you fill in a standard form: send or collect, which address, what is inside. The
clerk returns a standard receipt: "accepted", "address unknown", "we are overloaded today". Because
everyone uses the same forms, any post office understands any customer. **HTTP** is that shared
form between clients and servers on the web.

### Terms
- **HTTP** (HyperText Transfer Protocol): the agreed format for web requests and responses.
- **Method**: the request's verb. `GET` fetches; `POST` submits something new; `PUT` replaces;
  `DELETE` removes.
- **Path**: what you want, e.g. `/menu/sandwiches`.
- **Headers**: extra lines of information such as preferred language or cookies.
- **Body**: the main content, such as an HTML page or order details.
- **Status code**: a number summarising the result. 2xx success; 3xx go elsewhere; 4xx the client
  got something wrong; 5xx the server had a problem.
- **Stateless**: HTTP does not remember earlier requests. To "remember" (logged in, cart), the
  client sends a token such as a **cookie** (a small piece of data the browser stores and sends
  back) and the server looks the details up in storage.
- **Safe**: a method that should not change anything on the server (`GET`). **Idempotent**: sending
  it once or twice has the same effect (`GET`, `PUT`, `DELETE`). `POST` is neither: sending it twice
  may create two orders.

### Misconceptions
- "HTTP remembers who I am." It does not; cookies and the server do.
- "404 means the server is broken." 4xx means the request was wrong (e.g. a bad path). A broken
  server answers 5xx.
- "Clicking 'Place order' twice still makes one order." Only if the system is built to be
  idempotent (L3).

### Step 1 — Observe
A request (our own example):

```
GET /menu/sandwiches HTTP/1.1
Host: your-shop.example
Accept-Language: en
```

And the response:

```
HTTP/1.1 200 OK
Content-Type: text/html

<html>…the sandwich menu…</html>
```

### Step 2 — Analyse
- The first request line has three parts: method (`GET`), path, protocol version.
- The first response line holds the status code `200` and the phrase `OK`.
- Before sending, the client opens a TCP connection, which costs one round trip. If the connection
  is kept open (keep-alive), the next request skips that cost.

### Step 3 — Apply
In the lab, `writeRatio` splits requests into **reads** (like `GET`) and **writes** (like
`POST/PUT/DELETE`). Open the companion Lab, change `writeRatio` from 0.2 to 0.8 and watch the
per-class breakdown change.

### Check (pass with 4 of 5)
1. What does `DELETE /cart/items/7` ask for? *(Remove item 7 from the cart.)*
2. The server returns `503`. Whose side is the problem on? *(The server's — 5xx.)*
3. The server returns `404` for `/menu/sandwichs`. What probably happened? *(The client mistyped
   the path; the resource does not exist.)*
4. Why is resending a `GET` on a flaky network usually fine, but resending `POST /orders` risky?
   *(GET is safe and idempotent; POST may create a second order.)*
5. HTTP is stateless, so how does a site know you are logged in? *(The browser sends a cookie with
   a session ID; the server looks that ID up in its session storage.)*

### Takeaways
- An HTTP request is method + path + headers (+ body); a response is status + headers (+ body).
- 4xx: the client was wrong. 5xx: the server had trouble.
- HTTP forgets; cookies and servers remember.

### Review questions
1. Name four HTTP methods and what each does.
2. What does the 3xx group mean?
3. What does "idempotent" mean? Give an idempotent method.
