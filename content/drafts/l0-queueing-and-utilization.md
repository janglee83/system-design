---
id: l0-queueing-and-utilization
level: L0
format: experiment
minutes: 15
difficulty: 2
prerequisites: [l0-throughput-and-capacity]
research: [content/research/queueing-and-utilization.md]
engine_readiness: ready-1a
engine_gaps: []
status: draft
---

# Experiment spec (shared)

The 1a engine computes per-node latency as `serviceMs / (1 − utilization)` (utilization capped at
0.95) plus queue wait — the textbook single-server queue. Expected values from our scratch 1a model.

```json
{
  "world": { "durationMs": 10000, "seed": 1 },
  "workload": { "profile": "mixed", "baseRps": 8500, "writeRatio": 0.2 },
  "graph": { "nodes": [{"id":"users","kind":"client"},{"id":"web","kind":"web-server","config":{"cpu":1}}],
             "edges": [{"id":"e1","from":"users","to":"web","kind":"http"}] },
  "controls": [ { "id": "cpu", "type": "stepper", "maps": "nodes.web.config.cpu", "options": [1, 2, 4], "default": 1 } ],
  "goals": [
    { "id": "fast", "metric": "p95", "op": "<=", "value": 10 },
    { "id": "headroom", "metric": "peakBusy", "op": "<=", "value": 0.7 },
    { "id": "budget", "metric": "costPerMonth", "op": "<=", "value": 50 }
  ],
  "choices": [
    { "id": "A", "correct": true, "set": {"cpu": 2}, "expect": {"p95": "≈4.3 ms", "peakBusy": 0.47, "costPerMonth": 45} },
    { "id": "B", "misconception": "M1", "set": {"cpu": 1}, "expect": {"p95": "≈36.5 ms", "peakBusy": 0.94, "requestsRejected": 0}, "failsGoals": ["fast", "headroom"] },
    { "id": "C", "misconception": "M3", "set": {"cpu": 4}, "expect": {"p95": "≈3.1 ms", "peakBusy": 0.24, "costPerMonth": 90}, "failsGoals": ["budget"] }
  ]
}
```

---

# Tiếng Việt

## Hàng đợi: vì sao máy chủ bận 94% đã là có chuyện

### Mục tiêu
Chọn cấu hình giữ độ bận dưới 70% để p95 dưới 10 ms trong ngân sách, và giải thích vì sao "không có
lỗi nào" chưa có nghĩa là máy chủ khỏe.

### Cần học trước
`l0-throughput-and-capacity`

### Hình dung trước
Quầy thu ngân siêu thị: khi cô thu ngân chỉ bận nửa thời gian, bạn hầu như không phải chờ. Khi cô bận
95% thời gian, chỉ cần vài người đến sát nhau là hàng dài ra tận quầy rau. Cô vẫn chưa "quá tải",
chưa đuổi ai về — nhưng ai cũng phải chờ rất lâu.

### Thuật ngữ
- **Utilization** (độ bận, mức sử dụng): phần thời gian máy chủ đang làm việc. Trong phòng thí
  nghiệm là `peakBusy`.
- **Service time** (thời gian phục vụ): thời gian xử lý một yêu cầu khi không phải chờ (ở đây
  2 ms).
- **Queueing delay** (trễ do xếp hàng): thời gian chờ đến lượt.
- **Công thức hàng đợi một quầy:** thời gian phản hồi ≈ thời gian phục vụ ÷ (1 − độ bận). Bận 50% →
  gấp 2; bận 90% → gấp 10; bận 95% → gấp 20.
- **Little's Law** (định luật Little): số yêu cầu đang nằm trong hệ thống = tốc độ đến × thời gian
  mỗi yêu cầu ở lại. Ví dụ 2.000 yêu cầu/giây × 0,05 giây = 100 yêu cầu cùng lúc.
- **Headroom** (khoảng dự phòng): phần sức chứa cố ý để trống cho những lúc dồn dập.

### Hiểu lầm thường gặp
- **M1.** "Máy bận 94% mà không có lỗi nào thì vẫn ổn." Độ trễ đã gấp gần 20 lần thời gian phục
  vụ.
- **M2.** "Độ trễ tăng đều theo độ bận." Nó tăng theo đường cong dốc đứng gần 100% (thảo luận bằng
  biểu đồ; không có lựa chọn riêng).
- **M3.** "Khoảng dự phòng càng nhiều càng tốt." Máy rảnh 76% thời gian là tiền bỏ không.

### Thí nghiệm
**Bối cảnh:** 8.500 yêu cầu/giây, máy chủ 1 vCPU (sức chứa khoảng 9.000). Bạn chọn số vCPU: 1, 2
hoặc 4. Ngân sách $50/tháng.

**Dự đoán:** Với 1 vCPU, có yêu cầu nào bị từ chối không? p95 sẽ khoảng 3 ms, 10 ms hay 35 ms?

**Mục tiêu:** `p95 ≤ 10 ms`, `peakBusy ≤ 0,7`, `chi phí ≤ $50/tháng`.

| Lựa chọn | vCPU | Độ bận | p95 dự kiến | Chi phí | Kết quả |
|---|---|---|---|---|---|
| A (đúng) | 2 | khoảng 47% | khoảng 4,3 ms | $45 | đạt |
| B | 1 | khoảng 94% | khoảng 36 ms, 0 lỗi | $22,5 | ✗ chậm, không có dự phòng |
| C | 4 | khoảng 24% | khoảng 3,1 ms | $90 | ✗ vượt ngân sách |

Sau khi chạy, mở biểu đồ "độ trễ theo độ bận" của bài: ba điểm A, B, C nằm trên cùng một đường cong.

### Phản hồi cho lựa chọn sai
- **B:** Không yêu cầu nào bị từ chối, nhưng mỗi yêu cầu chờ gần 20 lần thời gian xử lý thật. Ở độ
  bận 94%, chỉ một đợt tăng nhẹ là hàng đợi bắt đầu phình. "Không lỗi" chỉ nghĩa là chưa vỡ.
- **C:** p95 có tốt hơn A một chút (khoảng 1 ms), nhưng bạn trả gấp đôi để máy rảnh ba phần tư thời
  gian. Dự phòng cần đủ, không cần tối đa.

### Điều cần nhớ
- Độ trễ tăng vọt khi độ bận tiến gần 100%; vùng nguy hiểm bắt đầu từ khoảng 70%.
- "Không có lỗi" không có nghĩa là khỏe; hãy nhìn cả độ bận và p95.
- Chọn mức dự phòng có chủ đích, rồi dừng.

### Câu hỏi ôn tập
1. Thời gian phục vụ 2 ms, độ bận 90%. Thời gian phản hồi trung bình khoảng bao nhiêu? *(Khoảng
   20 ms.)*
2. 1.000 yêu cầu/giây, mỗi yêu cầu ở lại 0,2 giây. Có bao nhiêu yêu cầu cùng lúc trong hệ thống?
   *(Khoảng 200.)*
3. Vì sao các hệ thống tự co giãn thường đặt mục tiêu khoảng 50% CPU? *(Để còn chỗ cho đợt tăng tải
   và giữ độ trễ thấp.)*

---

# English

## Queues: why a server at 94% busy is already in trouble

### Outcome
Pick a configuration that keeps utilization under 70% so p95 stays under 10 ms within budget, and
explain why "zero errors" does not mean "healthy".

### Prerequisites
`l0-throughput-and-capacity`

### Picture it first
A supermarket checkout: when the cashier is busy half the time, you barely wait. When she is busy
95% of the time, a few shoppers arriving close together stretch the line past the vegetables. She
is not "overloaded" and nobody is turned away — but everyone waits a long time.

### Terms
- **Utilization**: the share of time a server is working. In the lab: `peakBusy`.
- **Service time**: time to process one request with no waiting (2 ms here).
- **Queueing delay**: time spent waiting for your turn.
- **The single-queue rule:** response time ≈ service time ÷ (1 − utilization). 50% busy → 2×;
  90% → 10×; 95% → 20×.
- **Little's Law**: requests inside a system = arrival rate × time each one stays. For example
  2,000 requests/s × 0.05 s = 100 requests in flight.
- **Headroom**: capacity deliberately left free for bursts.

### Misconceptions
- **M1.** "94% busy with no errors is fine." Latency is already nearly 20× the service time.
- **M2.** "Latency grows steadily with utilization." It shoots up near 100% (shown on a chart; no
  separate choice).
- **M3.** "The more headroom the better." A server idle 76% of the time is money left on the table.

### Experiment
**Setup:** 8,500 requests/s on a 1-vCPU server (capacity about 9,000). Choose 1, 2 or 4 vCPUs.
Budget $50/month.

**Predict:** With 1 vCPU, are any requests rejected? Will p95 be about 3 ms, 10 ms or 35 ms?

**Goals:** `p95 ≤ 10 ms`, `peakBusy ≤ 0.7`, `cost ≤ $50/month`.

| Choice | vCPU | Utilization | Expected p95 | Cost | Result |
|---|---|---|---|---|---|
| A (correct) | 2 | about 47% | about 4.3 ms | $45 | pass |
| B | 1 | about 94% | about 36 ms, 0 errors | $22.5 | ✗ slow, no headroom |
| C | 4 | about 24% | about 3.1 ms | $90 | ✗ over budget |

After running, open the lesson's "latency vs utilization" chart: A, B and C sit on the same curve.

### Feedback for wrong choices
- **B:** Nothing was rejected, but each request waits nearly 20 times its real processing time. At
  94% busy, a small bump starts the queue growing. "No errors" only means "not broken yet".
- **C:** p95 is about 1 ms better than A, but you pay double for a server idle three quarters of the
  time. Headroom should be enough, not maximal.

### Takeaways
- Latency shoots up as utilization approaches 100%; the danger zone starts around 70%.
- "No errors" is not "healthy"; look at utilization and p95 together.
- Choose a deliberate headroom, then stop.

### Review questions
1. Service time 2 ms, 90% busy. Roughly what is the average response time? *(About 20 ms.)*
2. 1,000 requests/s, each staying 0.2 s. How many are in the system at once? *(About 200.)*
3. Why do autoscalers often target about 50% CPU? *(To leave room for bursts and keep latency low.)*
