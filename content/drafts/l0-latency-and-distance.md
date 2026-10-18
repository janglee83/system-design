---
id: l0-latency-and-distance
level: L0
format: experiment
minutes: 15
difficulty: 1
prerequisites: [l0-client-server]
research: [content/research/latency-and-distance.md]
engine_readiness: ready-1a
engine_gaps: []
status: draft
---

# Experiment spec (shared)

The "server location" control maps to the run-level calibration override `edgeDelayHttpMs`
(spec §6.7). We use it as the round-trip time on the wire: same city 2 ms, same continent 40 ms,
other side of the world 160 ms (fibre round-trip figures from the research note). Expected numbers
are from our scratch 1a model; confirm with `sim-cli check`.

```json
{
  "world": { "durationMs": 10000, "seed": 1 },
  "workload": { "profile": "read-heavy", "baseRps": 2000, "writeRatio": 0.1 },
  "graph": { "nodes": [{"id":"users","kind":"client"},{"id":"web","kind":"web-server","config":{"cpu":1}}],
             "edges": [{"id":"e1","from":"users","to":"web","kind":"http"}] },
  "controls": [
    { "id": "location", "type": "select", "maps": "calibration.edgeDelayHttpMs",
      "options": { "same-city": 2, "same-continent": 40, "other-side": 160 }, "default": "other-side" },
    { "id": "cpu", "type": "select", "maps": "nodes.web.config.cpu", "options": [1, 8], "default": 1 }
  ],
  "goals": [ { "id": "snappy", "metric": "p95", "op": "<=", "value": 100 } ],
  "choices": [
    { "id": "A", "correct": true, "set": {"location": "same-continent", "cpu": 1}, "expect": {"p95": "≈43 ms", "costPerMonth": 22.5} },
    { "id": "A2", "correct": true, "set": {"location": "same-city", "cpu": 1}, "expect": {"p95": "≈4.6 ms"} },
    { "id": "B", "misconception": "M1", "set": {"location": "other-side", "cpu": 8}, "expect": {"p95": "≈162 ms", "costPerMonth": 180}, "failsGoals": ["snappy"] },
    { "id": "C", "misconception": "M2", "set": {"location": "other-side", "cpu": 1}, "expect": {"p95": "≈163 ms"}, "failsGoals": ["snappy"] }
  ]
}
```

---

# Tiếng Việt

## Độ trễ: vì sao ở xa thì chậm

### Mục tiêu
Chọn vị trí đặt máy chủ để 95% người dùng nhận phản hồi trong vòng 100 ms, và chứng minh bằng
số liệu rằng mua máy mạnh hơn không bù được khoảng cách.

### Cần học trước
`l0-client-server`

### Hình dung trước
Bạn đặt một món đồ từ cửa hàng cùng quận: chiều là có. Đặt cùng món đó từ nước ngoài: cả tuần. Cửa
hàng nước ngoài đóng gói nhanh gấp mười cũng không làm máy bay bay nhanh hơn. Trên Internet cũng
vậy: tín hiệu chạy trong cáp quang chỉ nhanh chừng đó.

### Thuật ngữ
- **Latency** (độ trễ): thời gian chờ từ lúc gửi đến lúc nhận được phản hồi, đo bằng mili giây
  (ms; 1 ms = một phần nghìn giây).
- **Round-trip time, RTT** (thời gian một vòng đi–về): thời gian tín hiệu đi tới đích và quay lại.
- **Propagation delay** (trễ lan truyền): phần độ trễ do khoảng cách. Ánh sáng trong cáp quang đi
  khoảng 200.000 km/giây, tức khoảng 5 ms cho mỗi 1.000 km một chiều.
- **Bandwidth** (băng thông): lượng dữ liệu đi qua được mỗi giây. Ống to không có nghĩa là nước tới
  sớm hơn.
- **p95**: 95% yêu cầu nhanh hơn con số này (bài `l0-percentiles` sẽ nói kỹ).

Một vài con số thật (cáp quang, tốt nhất có thể): New York ↔ London khoảng 56 ms một vòng; New
York ↔ Sydney khoảng 160 ms. Người dùng bắt đầu thấy "chậm" khi phản hồi vượt quá khoảng 100 ms.

### Hiểu lầm thường gặp
- **M1.** "Máy chủ mạnh hơn sẽ làm người dùng ở xa nhanh hơn." CPU chỉ rút ngắn thời gian xử lý,
  không rút ngắn đường cáp.
- **M2.** "Internet gần như tức thời, đặt máy chủ ở đâu cũng vậy." Vật lý nói khác.
- **M3.** "Băng thông lớn hơn là độ trễ thấp hơn." Hai đại lượng khác nhau (thảo luận, không có
  lựa chọn riêng trong thí nghiệm).

### Thí nghiệm
**Bối cảnh:** Khách hàng của bạn ở Đông Nam Á, 2.000 yêu cầu/giây. Máy chủ hiện đặt ở "bên kia địa
cầu". Bạn có hai nút điều khiển: **vị trí máy chủ** (cùng thành phố / cùng châu lục / bên kia địa
cầu) và **số vCPU** (1 hoặc 8).

**Dự đoán:** Nếu giữ máy ở bên kia địa cầu nhưng tăng lên 8 vCPU, p95 giảm từ khoảng 163 ms xuống
còn bao nhiêu?

**Mục tiêu:** `p95 ≤ 100 ms`.

| Lựa chọn | Vị trí | vCPU | p95 dự kiến | Chi phí/tháng |
|---|---|---|---|---|
| A (đúng) | cùng châu lục | 1 | khoảng 43 ms | $22,5 |
| A2 (cũng đúng) | cùng thành phố | 1 | khoảng 5 ms | $22,5 |
| B | bên kia địa cầu | 8 | khoảng 162 ms ✗ | $180 |
| C | bên kia địa cầu | 1 | khoảng 163 ms ✗ | $22,5 |

Mở **Follow request** ở lựa chọn B: phần lớn thời gian nằm trên cạnh mạng, không phải ở máy chủ.

### Phản hồi cho lựa chọn sai
- **B:** Bạn trả gấp tám lần tiền nhưng p95 chỉ giảm chưa tới 1 ms. Máy chủ vốn chỉ mất khoảng 2 ms
  để xử lý; 160 ms còn lại là thời gian tín hiệu đi qua nửa vòng Trái Đất. Muốn nhanh, hãy đưa máy
  chủ (hoặc nội dung) lại gần người dùng.
- **C:** Ở đây máy chủ không hề bận (chỉ khoảng 22%), vậy mà p95 vẫn vượt 160 ms. Khoảng cách tự
  nó đã vượt ngân sách 100 ms.

### Điều cần nhớ
- Độ trễ có một "sàn" do khoảng cách mà không phần cứng nào hạ được.
- Xem độ trễ nằm ở đâu (mạng hay máy chủ) trước khi chi tiền.
- Đưa máy chủ hoặc nội dung lại gần người dùng là cách giảm độ trễ hiệu quả nhất (CDN ở cấp L1).

### Câu hỏi ôn tập
1. Khoảng 1.000 km cáp quang thêm bao nhiêu ms một chiều? *(Khoảng 5 ms.)*
2. Vì sao 8 vCPU gần như không đổi p95 trong thí nghiệm? *(Thời gian xử lý chỉ khoảng 2 ms; phần
   lớn là đường truyền.)*
3. Băng thông và độ trễ khác nhau thế nào? *(Băng thông: bao nhiêu dữ liệu mỗi giây; độ trễ: chờ
   bao lâu.)*
4. Người dùng bắt đầu cảm thấy chậm từ khoảng bao nhiêu ms? *(Khoảng 100 ms.)*

---

# English

## Latency: why far away means slow

### Outcome
Choose where to place a server so that 95% of users get a response within 100 ms, and show with
numbers that a faster machine cannot make up for distance.

### Prerequisites
`l0-client-server`

### Picture it first
Order something from a shop in your district and it arrives this afternoon. Order the same thing
from abroad and it takes a week. If the foreign shop packs ten times faster, the plane still flies
at the same speed. The Internet is the same: signals in fibre only travel so fast.

### Terms
- **Latency**: the waiting time between sending something and getting the answer, in milliseconds
  (ms; 1 ms is a thousandth of a second).
- **Round-trip time (RTT)**: time for a signal to reach the destination and come back.
- **Propagation delay**: the part of latency caused by distance. Light in fibre travels about
  200,000 km/s — roughly 5 ms per 1,000 km one way.
- **Bandwidth**: how much data can pass per second. A wider pipe does not make the first drop
  arrive sooner.
- **p95**: 95% of requests are faster than this number (covered in `l0-percentiles`).

Some real figures (fibre, best case): New York ↔ London about 56 ms round trip; New York ↔ Sydney
about 160 ms. People start to feel "slow" beyond roughly 100 ms.

### Misconceptions
- **M1.** "A more powerful server makes far-away users faster." CPU shortens processing, not cable.
- **M2.** "The Internet is basically instant; server location does not matter." Physics disagrees.
- **M3.** "More bandwidth means lower latency." Two different quantities (discussed; no separate
  experiment choice).

### Experiment
**Setup:** Your customers are in South-East Asia, 2,000 requests per second. The server sits on
"the other side of the world". Two controls: **server location** (same city / same continent /
other side of the world) and **vCPUs** (1 or 8).

**Predict:** Keeping the server far away but moving to 8 vCPUs, how far does p95 drop from about
163 ms?

**Goal:** `p95 ≤ 100 ms`.

| Choice | Location | vCPU | Expected p95 | Cost/month |
|---|---|---|---|---|
| A (correct) | same continent | 1 | about 43 ms | $22.5 |
| A2 (also correct) | same city | 1 | about 5 ms | $22.5 |
| B | other side | 8 | about 162 ms ✗ | $180 |
| C | other side | 1 | about 163 ms ✗ | $22.5 |

Open **Follow request** on choice B: most of the time is spent on the network edge, not in the
server.

### Feedback for wrong choices
- **B:** You pay eight times as much and p95 drops by less than 1 ms. The server only needed about
  2 ms to process each request; the other 160 ms is the signal crossing half the planet. To be fast,
  move the server (or the content) closer to users.
- **C:** The server is barely busy (about 22%), yet p95 is above 160 ms. Distance alone blows the
  100 ms budget.

### Takeaways
- Latency has a floor set by distance that no hardware removes.
- Find where the time goes (network or server) before spending money.
- Moving servers or content closer to users is the strongest latency fix (CDNs in L1).

### Review questions
1. Roughly how many ms does 1,000 km of fibre add one way? *(About 5 ms.)*
2. Why did 8 vCPUs barely change p95? *(Processing was only about 2 ms; the wire dominated.)*
3. How do bandwidth and latency differ? *(Bandwidth: how much per second; latency: how long you
   wait.)*
4. From about how many ms do users start to notice delay? *(Around 100 ms.)*
