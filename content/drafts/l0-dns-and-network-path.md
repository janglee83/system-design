---
id: l0-dns-and-network-path
level: L0
format: reading+check
minutes: 10
difficulty: 1
prerequisites: [l0-http-basics]
research: [content/research/dns-and-network-path.md]
engine_readiness: not-needed
engine_gaps: [connection-setup-cost]
status: draft
---

# Check spec (shared)

Reading lesson. It would become an experiment ("first visit vs repeat visit") once the engine
models connection setup cost (gap `connection-setup-cost`). Pass the check with 4 of 5.

---

# Tiếng Việt

## Từ tên miền đến máy chủ: DNS và đường đi của request

### Mục tiêu
Kể theo đúng thứ tự những gì xảy ra từ lúc bạn gõ một địa chỉ web đến lúc yêu cầu HTTP đầu tiên
được gửi đi, và giải thích vì sao đổi địa chỉ máy chủ không có hiệu lực ngay lập tức.

### Cần học trước
`l0-http-basics`

### Hình dung trước
Bạn muốn gọi cho bà ngoại. Bạn không nhớ số, chỉ nhớ tên "Bà ngoại" trong danh bạ. Điện thoại tra
danh bạ ra số rồi mới gọi. Nếu bà đổi số mà danh bạ của bạn chưa cập nhật, bạn sẽ gọi nhầm số cũ
một thời gian.

### Thuật ngữ
- **IP address** (địa chỉ IP): "số điện thoại" của một máy trên mạng, ví dụ `192.0.2.10`.
- **Domain name** (tên miền): cái tên dễ nhớ như `quan-cua-ban.example`; đọc từ phải sang trái:
  `example` là tên miền cấp cao nhất (**TLD**), rồi đến tên của bạn.
- **DNS** (Domain Name System, hệ thống tên miền): "danh bạ" phân tán của Internet, đổi tên miền
  thành địa chỉ IP.
- **Recursive resolver** (máy phân giải đệ quy): máy (thường của nhà mạng) đi hỏi giúp bạn.
- **Authoritative nameserver** (máy chủ tên có thẩm quyền): nơi giữ câu trả lời chính thức cho một
  tên miền.
- **TTL** (time to live, thời gian sống): số giây một câu trả lời DNS được phép giữ trong bộ nhớ
  tạm trước khi phải hỏi lại.
- **TCP handshake** (bắt tay TCP): ba gói tin mở kết nối; tốn một vòng đi–về trước khi gửi được
  dữ liệu.

### Hiểu lầm thường gặp
- "Gõ địa chỉ là đến thẳng máy chủ." Thực ra có thể có vài lần tra cứu trước đó.
- "Đổi DNS là mọi người thấy ngay." Các bản lưu tạm sống đến hết TTL.
- "Một tên miền = một máy chủ." Một tên có thể trỏ đến nhiều địa chỉ, hoặc đến bộ cân bằng tải.

### Bước 1 — Quan sát: hành trình
1. Trình duyệt xem trong bộ nhớ tạm của nó và của máy tính.
2. Nếu chưa có, hỏi máy phân giải đệ quy.
3. Máy phân giải hỏi máy chủ gốc (root) → được chỉ đến máy chủ của `.example`.
4. Hỏi máy chủ `.example` → được chỉ đến máy chủ có thẩm quyền của tên miền.
5. Máy chủ có thẩm quyền trả địa chỉ IP kèm TTL. Mọi tầng lưu tạm câu trả lời.
6. Trình duyệt mở kết nối TCP (một vòng đi–về), thêm TLS nếu là HTTPS, rồi gửi yêu cầu HTTP.

### Bước 2 — Phân tích
- Lần truy cập đầu tiên tốn thêm các bước 2–5 và bước bắt tay; lần sau thường nhanh hơn nhờ bộ nhớ
  tạm và kết nối được giữ lại.
- TTL là đánh đổi: TTL dài thì ít phải hỏi lại (nhanh) nhưng đổi địa chỉ chậm lan ra; TTL ngắn thì
  ngược lại. Một số bộ cân bằng tải trên đám mây dùng TTL 60 giây.

### Bước 3 — Áp dụng
Bạn chuyển trang web sang máy chủ mới lúc 9:00, bản ghi DNS cũ có TTL 1 giờ. Đến 9:30, một số
người vẫn vào máy chủ cũ. Vì sao? Nên làm gì từ hôm trước? *(Họ còn câu trả lời cũ trong bộ nhớ
tạm; nên hạ TTL xuống thấp từ trước khi chuyển và giữ máy cũ chạy thêm một thời gian.)*

### Kiểm tra (đạt khi đúng 4/5)
1. DNS đổi cái gì thành cái gì? *(Tên miền thành địa chỉ IP.)*
2. Trong `shop.vi.example`, đâu là TLD? *(`example`.)*
3. TTL 300 nghĩa là gì? *(Câu trả lời được giữ tạm tối đa 300 giây.)*
4. Vì sao lần vào trang đầu tiên thường chậm hơn lần thứ hai? *(Phải tra DNS và bắt tay kết nối;
   lần sau đã có trong bộ nhớ tạm và có thể dùng lại kết nối.)*
5. Đúng hay sai: một tên miền chỉ trỏ được đến một máy chủ. *(Sai.)*

### Điều cần nhớ
- Trước khi có yêu cầu HTTP, thường đã có tra cứu DNS và bắt tay kết nối.
- Bộ nhớ tạm làm mọi thứ nhanh nhưng làm thay đổi chậm lan ra; TTL quyết định bao lâu.
- Tên miền có thể trỏ đến nhiều máy hoặc một bộ cân bằng tải.

### Câu hỏi ôn tập
1. Kể bốn loại máy chủ tham gia một lần tra DNS đầy đủ.
2. TTL dài có lợi và hại gì?
3. Tại sao bắt tay TCP làm người dùng ở xa thấy chậm hơn?

---

# English

## From a name to a server: DNS and the path of a request

### Outcome
List, in order, what happens between typing a web address and sending the first HTTP request, and
explain why changing a server's address does not take effect for everyone at once.

### Prerequisites
`l0-http-basics`

### Picture it first
You want to call Grandma. You do not know her number, only the name "Grandma" in your contacts. The
phone looks up the number, then dials. If she changed numbers and your contacts are out of date, you
keep reaching the old number for a while.

### Terms
- **IP address**: the "phone number" of a machine on a network, e.g. `192.0.2.10`.
- **Domain name**: a memorable name such as `your-shop.example`; read right to left: `example` is
  the top-level domain (**TLD**), then your name.
- **DNS** (Domain Name System): the Internet's distributed contact list, turning names into IP
  addresses.
- **Recursive resolver**: a server (often your ISP's) that does the asking for you.
- **Authoritative nameserver**: the server that holds the official answer for a domain.
- **TTL** (time to live): how many seconds a DNS answer may be cached before asking again.
- **TCP handshake**: three packets that open a connection; costs one round trip before data flows.

### Misconceptions
- "Typing an address goes straight to the server." Several lookups may happen first.
- "A DNS change is instant." Cached answers live until their TTL runs out.
- "One domain = one server." A name can point to many addresses or to a load balancer.

### Step 1 — Observe: the journey
1. The browser checks its own cache and the operating system's.
2. On a miss, it asks a recursive resolver.
3. The resolver asks a root server → pointed to the `.example` servers.
4. It asks a `.example` server → pointed to the domain's authoritative nameserver.
5. The authoritative server returns the IP address with a TTL. Every layer caches it.
6. The browser opens a TCP connection (one round trip), adds TLS for HTTPS, then sends HTTP.

### Step 2 — Analyse
- The first visit pays for steps 2–5 and the handshake; later visits are usually faster thanks to
  caches and reused connections.
- TTL is a trade-off: long TTL means fewer lookups but slow change; short TTL the reverse. Some cloud
  load balancers use a 60-second TTL.

### Step 3 — Apply
You move your site to a new server at 9:00; the old DNS record had a 1-hour TTL. At 9:30 some
people still reach the old server. Why, and what should you have done the day before? *(They hold
the old answer in cache; lower the TTL well before the move and keep the old server running for a
while.)*

### Check (pass with 4 of 5)
1. DNS turns what into what? *(A domain name into an IP address.)*
2. In `shop.en.example`, which part is the TLD? *(`example`.)*
3. What does a TTL of 300 mean? *(The answer may be cached for at most 300 seconds.)*
4. Why is the first visit to a site often slower than the second? *(DNS lookup and connection
   handshake; next time both are cached or reused.)*
5. True or false: a domain can point to only one server. *(False.)*

### Takeaways
- Before an HTTP request there is usually a DNS lookup and a connection handshake.
- Caches make things fast but make changes slow to spread; TTL decides how slow.
- A name can point to many machines or to a load balancer.

### Review questions
1. Name four kinds of server involved in a full DNS lookup.
2. What are the upside and downside of a long TTL?
3. Why does the TCP handshake hurt far-away users more?
