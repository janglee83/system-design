---
id: l0-client-server
level: L0
format: experiment
minutes: 12
difficulty: 1
prerequisites: []
research: [content/research/client-server-and-http.md]
engine_readiness: ready-1a
engine_gaps: []
status: draft
---

# Experiment spec (shared by both languages)

Expected numbers come from our scratch re-implementation of the 1a model and must be confirmed
with `sim-cli check` before publishing.

```json
{
  "world": { "durationMs": 10000, "seed": 1 },
  "workload": { "profile": "mixed", "baseRps": 500, "writeRatio": 0.2 },
  "palette": ["client", "web-server", "lb"],
  "goals": [
    { "id": "answered", "metric": "availability", "op": ">=", "value": 0.99 },
    { "id": "reachable", "metric": "requestsUnreachable", "op": "<=", "value": 0 }
  ],
  "choices": [
    { "id": "A", "correct": true,
      "graph": { "nodes": [{"id":"users","kind":"client"},{"id":"web","kind":"web-server"}],
                 "edges": [{"id":"e1","from":"users","to":"web","kind":"http"}] },
      "expect": { "availability": 1.0, "requestsUnreachable": 0, "p95": "≈2.6 ms" } },
    { "id": "B", "misconception": "M1",
      "graph": { "nodes": [{"id":"users","kind":"client"},{"id":"lb","kind":"lb"}],
                 "edges": [{"id":"e1","from":"users","to":"lb","kind":"http"}] },
      "expect": { "availability": 0, "requestsUnreachable": "all" }, "failsGoals": ["answered", "reachable"] },
    { "id": "C", "misconception": "M2",
      "graph": { "nodes": [{"id":"users","kind":"client"},{"id":"web","kind":"web-server"}], "edges": [] },
      "expect": { "validation": "client.no-path (blocking), run refused" }, "failsGoals": ["validation"] },
    { "id": "D", "misconception": "M3",
      "graph": { "nodes": [{"id":"users","kind":"client"}], "edges": [] },
      "expect": { "validation": "client.no-path (blocking), run refused" }, "failsGoals": ["validation"] }
  ]
}
```

---

# Tiếng Việt

## Ai hỏi, ai trả lời: client và server

### Mục tiêu
Sau bài này, bạn tự nối được một đường đi để yêu cầu của người dùng đến được một máy chủ biết trả
lời, và giải thích vì sao ba cách nối sai kia không ai nhận được câu trả lời.

### Cần học trước
Không cần. Đây là bài đầu tiên.

### Hình dung trước
Bạn đứng ở quầy một tiệm bánh mì. Bạn nói "cho một ổ thịt". Cô bán hàng nghe, làm bánh, đưa bánh
cho bạn. Có hai vai rất rõ: **người hỏi** (bạn) và **người trả lời** (cô bán hàng). Nếu bạn đứng nói
với cái tủ kính, hay với ông bảo vệ đứng ở cửa, thì dù bạn nói to đến mấy cũng không ai làm bánh.

### Thuật ngữ
- **Client** (máy khách, bên hỏi): chương trình gửi yêu cầu đi, ví dụ trình duyệt hay ứng dụng
  điện thoại. Trong phòng thí nghiệm, khối `client` đại diện cho cả nghìn người dùng cùng lúc.
- **Server** (máy chủ, bên trả lời): chương trình ngồi chờ yêu cầu và gửi lại câu trả lời.
  "Client" và "server" là **vai**, không phải loại máy: một máy chủ web cũng là client khi nó đi hỏi
  cơ sở dữ liệu.
- **Request** (yêu cầu): một lần hỏi. **Response** (phản hồi): câu trả lời cho lần hỏi đó.
- **Load balancer** (bộ cân bằng tải, khối `lb`): một "người chia việc" đứng giữa, chuyển yêu cầu
  cho các máy chủ phía sau. Bạn sẽ học kỹ ở cấp L1; hôm nay chỉ cần biết nó **không tự trả lời**.
- **Availability** (tỉ lệ sẵn sàng): phần trăm yêu cầu nhận được câu trả lời thành công.

### Hiểu lầm thường gặp
- **M1.** "Chỉ cần có một cái hộp ở giữa trên Internet là có người trả lời." Thật ra hộp ở giữa chỉ
  chuyển tiếp; phải có máy chủ phía sau.
- **M2.** "Máy chủ cứ bật lên là người dùng tự tìm tới." Phải có đường đi (địa chỉ, kết nối) từ
  client đến server.
- **M3.** "Trang web nằm sẵn trong trình duyệt của tôi." Trình duyệt chỉ hiển thị những gì máy chủ
  gửi về.

### Thí nghiệm
**Bối cảnh:** 500 yêu cầu mỗi giây từ người dùng. Bạn có trong bảng công cụ: `client`,
`web-server`, `lb`. Hãy nối sao cho mọi yêu cầu đều được trả lời.

**Dự đoán trước khi chạy:** Nếu chỉ nối người dùng vào `lb`, bao nhiêu phần trăm yêu cầu được trả
lời? (0%, 50% hay 100%?)

**Mục tiêu đo:** `availability ≥ 99%` và `requestsUnreachable = 0` (không yêu cầu nào "không tới
được nơi trả lời").

| Lựa chọn | Cách nối | Kết quả mong đợi |
|---|---|---|
| A (đúng) | người dùng → `web-server` (cạnh `http`) | availability 100%, p95 khoảng 2–3 ms |
| B | người dùng → `lb`, phía sau không có gì | availability 0%, mọi yêu cầu "unreachable" |
| C | có `web-server` nhưng không nối | Phòng thí nghiệm từ chối chạy: `client.no-path` |
| D | chỉ có người dùng, không có máy chủ | Phòng thí nghiệm từ chối chạy: `client.no-path` |

Mở tab **Follow request** ở lựa chọn A: bạn sẽ thấy mỗi yêu cầu đi một bước tới `web` rồi quay về.

### Phản hồi cho lựa chọn sai
- **B:** Bộ cân bằng tải nhận yêu cầu nhưng không có ai phía sau để chuyển cho, nên mọi yêu cầu
  đều rơi vào khoảng trống. "Người chia việc" mà không có ai để chia việc thì không làm ra bánh mì.
- **C:** Máy chủ có tồn tại nhưng người dùng không có đường nào đến nó. Ngoài đời, đó là lúc bạn
  không biết địa chỉ hoặc không mở được kết nối. Hãy kéo một cạnh `http` từ người dùng đến máy chủ.
- **D:** Không có ai đóng vai trả lời. Trình duyệt không chứa sẵn trang web; nó phải hỏi một máy
  chủ mỗi lần.

### Điều cần nhớ
- Mỗi lần dùng web là một cặp hỏi–đáp giữa client và server.
- Client và server là vai trò; một chương trình có thể đóng cả hai vai.
- Hộp đứng giữa (như bộ cân bằng tải) chỉ chuyển tiếp; luôn cần một máy chủ thật sự trả lời.

### Câu hỏi ôn tập
1. Khi máy chủ web gửi câu hỏi tới cơ sở dữ liệu, máy chủ web đang đóng vai gì? *(Client.)*
2. Vì sao nối người dùng vào một bộ cân bằng tải trống cho tỉ lệ sẵn sàng 0%? *(Nó không có ai để
   chuyển yêu cầu tới; nó không tự trả lời.)*
3. Kể hai ví dụ về client trong đời thường. *(Trình duyệt, ứng dụng ngân hàng trên điện thoại, một
   script tải dữ liệu…)*
4. "Availability 99%" nghĩa là gì nếu có 10.000 yêu cầu? *(Khoảng 9.900 được trả lời thành công.)*

---

# English

## Who asks, who answers: client and server

### Outcome
By the end you can connect a path that lets users' requests reach a server that answers, and
explain why each of three wrong wirings leaves every user without an answer.

### Prerequisites
None. This is the first lesson.

### Picture it first
You are at a sandwich stall. You say "one chicken sandwich". The vendor hears you, makes it and
hands it over. Two clear roles: the one who **asks** and the one who **answers**. Talk to the
glass display or to the security guard at the door, and no sandwich appears however loudly you
order.

### Terms
- **Client**: a program that sends requests — a browser, a phone app. In the lab, one `client`
  block stands for many users at once.
- **Server**: a program that waits for requests and sends back answers. Client and server are
  **roles**, not kinds of machine: a web server becomes a client when it asks a database.
- **Request**: one question. **Response**: the answer to it.
- **Load balancer** (`lb` block): a middleman that hands requests to servers behind it. You will
  study it in L1; today you only need to know it **does not answer by itself**.
- **Availability**: the share of requests that got a successful answer.

### Misconceptions
- **M1.** "Any box in the middle of the Internet will answer me." A middle box forwards; something
  behind it must answer.
- **M2.** "Once a server is switched on, users find it on their own." There must be a path
  (address and connection) from client to server.
- **M3.** "The website already lives in my browser." The browser shows what a server sent.

### Experiment
**Setup:** 500 requests per second from users. Your palette has `client`, `web-server` and `lb`.
Wire them so every request gets an answer.

**Predict before you run:** If users connect only to an `lb`, what share of requests is answered:
0%, 50% or 100%?

**Goals:** `availability ≥ 99%` and `requestsUnreachable = 0` (no request failed to reach
something that can answer).

| Choice | Wiring | What you should see |
|---|---|---|
| A (correct) | users → `web-server` (`http` edge) | availability 100%, p95 about 2–3 ms |
| B | users → `lb` with nothing behind it | availability 0%, every request "unreachable" |
| C | a `web-server` exists but is not connected | the lab refuses to run: `client.no-path` |
| D | users only, no server | the lab refuses to run: `client.no-path` |

Open **Follow request** on choice A: each request takes one hop to `web` and comes back.

### Feedback for wrong choices
- **B:** The balancer accepts requests but has nobody to hand them to, so every request falls into
  a gap. A dispatcher with no workers produces no sandwiches.
- **C:** The server exists, but users have no way to reach it — in real life, no address or no
  connection. Drag an `http` edge from users to the server.
- **D:** Nobody plays the answering role. A browser does not contain the site; it asks a server
  every time.

### Takeaways
- Every use of the web is a question-and-answer pair between a client and a server.
- Client and server are roles; one program can play both.
- Boxes in the middle forward; a real server must still answer.

### Review questions
1. When a web server queries a database, which role is the web server playing? *(Client.)*
2. Why does wiring users to an empty load balancer give 0% availability? *(It has nobody to forward
   to; it does not answer on its own.)*
3. Name two everyday clients. *(A browser, a banking app, a script that downloads data…)*
4. With 10,000 requests, what does 99% availability mean? *(About 9,900 got a successful answer.)*
