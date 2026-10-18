---
id: l0-estimation-basics
level: L0
format: experiment
minutes: 18
difficulty: 2
prerequisites: [l0-queueing-and-utilization, l0-cost-basics]
research: [content/research/estimation-basics.md]
engine_readiness: ready-1a
engine_gaps: []
status: draft
---

# Experiment spec (shared)

The learner first computes average and peak load from a brief (20 M daily users × 50 requests;
peak 2× average), then sizes one server. The run models the average (11,600 rps) plus a 3 s peak at
2×. Expected values from our scratch 1a model.

```json
{
  "world": { "durationMs": 10000, "seed": 1 },
  "brief": { "dailyActiveUsers": 20000000, "requestsPerUserPerDay": 50, "peakFactor": 2, "targetUtilization": 0.7 },
  "workload": { "profile": "mixed", "baseRps": 11600, "writeRatio": 0.2,
                "surge": { "factor": 2, "atMs": 3000, "durationMs": 3000 } },
  "graph": { "nodes": [{"id":"users","kind":"client"},{"id":"web","kind":"web-server","config":{"cpu":2}}],
             "edges": [{"id":"e1","from":"users","to":"web","kind":"http"}] },
  "controls": [ { "id": "cpu", "type": "stepper", "maps": "nodes.web.config.cpu", "options": [2, 3, 4, 16], "default": 2 } ],
  "prediction": { "question": "Average rps and peak rps from the brief?", "answer": { "averageRps": "≈11,600", "peakRps": "≈23,000" } },
  "goals": [
    { "id": "fast", "metric": "p95", "op": "<=", "value": 10 },
    { "id": "headroom", "metric": "peakBusy", "op": "<=", "value": 0.75 },
    { "id": "budget", "metric": "costPerMonth", "op": "<=", "value": 120 }
  ],
  "choices": [
    { "id": "A", "correct": true, "set": {"cpu": 4}, "expect": {"p95": "≈6.1 ms", "peakBusy": 0.64, "costPerMonth": 90} },
    { "id": "B", "misconception": "M1", "set": {"cpu": 2}, "expect": {"p95": "≈263 ms", "peakBusy": 1.0, "requestsRejected": ">0"}, "failsGoals": ["fast", "headroom"] },
    { "id": "C", "misconception": "M2", "set": {"cpu": 3}, "expect": {"p95": "≈14.7 ms", "peakBusy": 0.86}, "failsGoals": ["fast", "headroom"] },
    { "id": "D", "misconception": "M3", "set": {"cpu": 16}, "expect": {"p95": "≈2.9 ms", "costPerMonth": 360}, "failsGoals": ["budget"] }
  ]
}
```

---

# Tiếng Việt

## Ước lượng nhanh: từ số người dùng đến số máy

### Mục tiêu
Từ một đề bài có số người dùng mỗi ngày, tính được số yêu cầu mỗi giây lúc bình thường và lúc cao
điểm, rồi chọn cỡ máy chủ giữ độ bận dưới 75% trong ngân sách.

### Cần học trước
`l0-queueing-and-utilization`, `l0-cost-basics`

### Hình dung trước
Bạn tổ chức tiệc cưới 300 khách. Bạn không đếm từng hạt gạo; bạn ước: mỗi khách ăn khoảng hai bát
cơm, giờ cao điểm là lúc khai tiệc, nên cần đủ bàn và người phục vụ cho lúc đó, cộng thêm chút dự
phòng. Thiết kế hệ thống cũng bắt đầu bằng những phép tính thô như vậy.

### Thuật ngữ
- **Back-of-the-envelope estimation** (ước lượng nháp): phép tính nhanh, làm tròn, để chọn giữa các
  thiết kế — không phải để tính hóa đơn chính xác.
- **DAU** (daily active users, người dùng hoạt động mỗi ngày).
- **Average rps** (số yêu cầu trung bình mỗi giây) = DAU × số yêu cầu mỗi người mỗi ngày ÷ 86.400
  (số giây trong một ngày).
- **Peak factor** (hệ số cao điểm): đỉnh tải gấp bao nhiêu lần trung bình.
- **Target utilization** (độ bận mục tiêu): mức bận bạn chấp nhận lúc cao điểm, ví dụ 70%, để còn dự
  phòng.

### Hiểu lầm thường gặp
- **M1.** "Chọn máy theo tải trung bình là đủ." Cao điểm làm máy sập.
- **M2.** "Vừa khít đỉnh tải là được." Ở độ bận 86%, độ trễ đã tăng mạnh (nhớ lại bài hàng đợi).
- **M3.** "Nhân dư thật nhiều cho an toàn." Tốn tiền; hãy dùng một mức dự phòng có lý do.

### Thí nghiệm
**Đề bài:** Ứng dụng có 20 triệu người dùng mỗi ngày, mỗi người tạo khoảng 50 yêu cầu. Cao điểm gấp
đôi trung bình. Bạn muốn lúc cao điểm máy bận không quá khoảng 70–75%. Ngân sách $120/tháng.

**Bước 1 — tự tính (dự đoán):**
- Trung bình: 20.000.000 × 50 ÷ 86.400 ≈ ? *(≈ 11.600 rps.)*
- Cao điểm: × 2 ≈ ? *(≈ 23.000 rps.)*
- Một vCPU xử lý khoảng 9.000 rps; ở mức 70% là khoảng 6.300 rps. Cần bao nhiêu vCPU? *(23.000 ÷
  6.300 ≈ 3,7 → làm tròn lên 4.)*

**Bước 2 — chạy thử.** Phòng thí nghiệm chạy tải trung bình, với 3 giây cao điểm gấp đôi.

**Mục tiêu:** `p95 ≤ 10 ms`, `peakBusy ≤ 0,75`, `chi phí ≤ $120/tháng`.

| Lựa chọn | vCPU | p95 | Độ bận đỉnh | Chi phí | Kết quả |
|---|---|---|---|---|---|
| A (đúng) | 4 | khoảng 6 ms | khoảng 64% | $90 | đạt |
| B | 2 | khoảng 263 ms, bị từ chối | 100% | $45 | ✗ chọn theo trung bình |
| C | 3 | khoảng 15 ms | khoảng 86% | $67,5 | ✗ vừa khít, không dự phòng |
| D | 16 | khoảng 3 ms | khoảng 16% | $360 | ✗ vượt ngân sách |

### Phản hồi cho lựa chọn sai
- **B:** 2 vCPU (khoảng 18.000 rps) chịu được trung bình 11.600, nhưng lúc cao điểm 23.000 thì vượt.
  Trong 3 giây đó hàng đợi đầy, yêu cầu bị từ chối. Luôn tính cho đỉnh tải.
- **C:** 3 vCPU (khoảng 27.000 rps) "đủ" cho đỉnh 23.000, nhưng độ bận 86% đẩy độ trễ lên khoảng 15 ms.
  "Vừa đủ" trên giấy là "quá chậm" ngoài đời.
- **D:** Đạt mọi mục tiêu tốc độ, nhưng tốn gấp bốn ngân sách và máy rảnh hơn 80% thời gian.

### Điều cần nhớ
- Trung bình rps = người dùng × yêu cầu mỗi người ÷ 86.400; rồi nhân hệ số cao điểm.
- Số máy = đỉnh tải ÷ (sức một máy × độ bận mục tiêu), làm tròn lên.
- Ước lượng để chọn hướng thiết kế; sai số vài chục phần trăm vẫn ổn.

### Câu hỏi ôn tập
1. 1 triệu người dùng, mỗi người 100 yêu cầu/ngày. Trung bình bao nhiêu rps? *(≈ 1.160 rps.)*
2. Đỉnh 30.000 rps, mỗi máy 10.000 rps, mục tiêu bận 60%. Cần mấy máy? *(30.000 ÷ 6.000 = 5.)*
3. Theo định luật Little, 2.000 rps với độ trễ 50 ms nghĩa là bao nhiêu yêu cầu đồng thời? *(≈ 100.)*

---

# English

## Quick estimates: from users to servers

### Outcome
From a brief stating daily users, compute normal and peak requests per second and choose a server
size that stays under 75% busy within budget.

### Prerequisites
`l0-queueing-and-utilization`, `l0-cost-basics`

### Picture it first
You are catering a 300-guest wedding. You do not count grains of rice; you estimate: about two bowls
per guest, the rush comes when dinner is served, so you need enough tables and staff for that
moment plus a little spare. System design starts with the same kind of rough arithmetic.

### Terms
- **Back-of-the-envelope estimation**: a quick, rounded calculation to choose between designs — not
  to compute an exact bill.
- **DAU** (daily active users).
- **Average rps** = DAU × requests per user per day ÷ 86,400 (seconds in a day).
- **Peak factor**: how many times the average the peak reaches.
- **Target utilization**: how busy you accept being at peak, e.g. 70%, to keep headroom.

### Misconceptions
- **M1.** "Size for the average load." The peak knocks you over.
- **M2.** "Exactly fitting the peak is fine." At 86% busy latency has already jumped (recall the
  queueing lesson).
- **M3.** "Multiply by a huge margin to be safe." Costly; use a stated headroom instead.

### Experiment
**Brief:** An app has 20 million daily users, each making about 50 requests. The peak is twice the
average. At peak you want the server no more than about 70–75% busy. Budget $120/month.

**Step 1 — work it out (prediction):**
- Average: 20,000,000 × 50 ÷ 86,400 ≈ ? *(≈ 11,600 rps.)*
- Peak: × 2 ≈ ? *(≈ 23,000 rps.)*
- One vCPU handles about 9,000 rps; at 70% that is about 6,300 rps. How many vCPUs? *(23,000 ÷ 6,300 ≈
  3.7 → round up to 4.)*

**Step 2 — run it.** The lab runs the average load with a 3-second peak at twice the rate.

**Goals:** `p95 ≤ 10 ms`, `peakBusy ≤ 0.75`, `cost ≤ $120/month`.

| Choice | vCPU | p95 | Peak busy | Cost | Result |
|---|---|---|---|---|---|
| A (correct) | 4 | about 6 ms | about 64% | $90 | pass |
| B | 2 | about 263 ms, rejecting | 100% | $45 | ✗ sized for the average |
| C | 3 | about 15 ms | about 86% | $67.5 | ✗ exact fit, no headroom |
| D | 16 | about 3 ms | about 16% | $360 | ✗ over budget |

### Feedback for wrong choices
- **B:** 2 vCPUs (about 18,000 rps) handle the 11,600 average but not the 23,000 peak. During those 3
  seconds the queue fills and requests are rejected. Always size for the peak.
- **C:** 3 vCPUs (about 27,000 rps) "cover" the 23,000 peak, but 86% busy pushes latency to about
  15 ms. "Just enough" on paper is "too slow" in practice.
- **D:** Meets every speed goal but costs four times the budget, idle over 80% of the time.

### Takeaways
- Average rps = users × requests per user ÷ 86,400; then apply the peak factor.
- Servers = peak ÷ (one server's capacity × target utilization), rounded up.
- Estimates choose a direction; being off by tens of percent is fine.

### Review questions
1. 1 million users, 100 requests each per day. Average rps? *(≈ 1,160 rps.)*
2. Peak 30,000 rps, 10,000 rps per server, 60% target. How many servers? *(30,000 ÷ 6,000 = 5.)*
3. By Little's Law, 2,000 rps at 50 ms latency means how many concurrent requests? *(≈ 100.)*
