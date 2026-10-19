---
id: l0-cost-basics
level: L0
format: experiment
minutes: 12
difficulty: 1
prerequisites: [l0-throughput-and-capacity]
research: [content/research/cost-basics.md]
engine_readiness: ready-1a
engine_gaps: []
status: draft
---

# Experiment spec (shared)

Prices are game-world defaults ($22.5 per web vCPU per month). A "cloud price list" preset can
override `webCostPerVcpu` (spec §6.7) in a follow-up Lab exercise. Expected values from our scratch
1a model.

```json
{
  "world": { "durationMs": 10000, "seed": 1 },
  "workload": { "profile": "mixed", "baseRps": 12000, "writeRatio": 0.2 },
  "graph": { "nodes": [{"id":"users","kind":"client"},{"id":"web","kind":"web-server","config":{"cpu":1}}],
             "edges": [{"id":"e1","from":"users","to":"web","kind":"http"}] },
  "controls": [ { "id": "cpu", "type": "stepper", "maps": "nodes.web.config.cpu", "options": [1, 2, 3, 8], "default": 8 } ],
  "goals": [
    { "id": "fast", "metric": "p95", "op": "<=", "value": 20 },
    { "id": "no-drops", "metric": "requestsRejected", "op": "<=", "value": 0 },
    { "id": "budget", "metric": "costPerMonth", "op": "<=", "value": 50 }
  ],
  "choices": [
    { "id": "A", "correct": true, "set": {"cpu": 2}, "expect": {"p95": "≈6.5 ms", "costPerMonth": 45, "peakBusy": 0.67} },
    { "id": "B", "misconception": "M1", "set": {"cpu": 8}, "expect": {"p95": "≈2.9 ms", "costPerMonth": 180}, "failsGoals": ["budget"] },
    { "id": "C", "misconception": "M2", "set": {"cpu": 1}, "expect": {"p95": "≈485 ms", "costPerMonth": 22.5, "requestsRejected": ">0"}, "failsGoals": ["fast", "no-drops"] },
    { "id": "D", "misconception": "M3", "set": {"cpu": 3}, "expect": {"p95": "≈4.1 ms", "costPerMonth": 67.5}, "failsGoals": ["budget"] }
  ]
}
```

---

# Tiếng Việt

## Chi phí cũng là một yêu cầu

### Mục tiêu
Chọn cấu hình rẻ nhất vẫn đạt mục tiêu tốc độ, và giải thích vì sao "to nhất" và "rẻ nhất" đều là
lựa chọn sai.

### Cần học trước
`l0-throughput-and-capacity`

### Hình dung trước
Bốn người bạn đi ăn tối. Thuê xe buýt 45 chỗ: ai cũng tới nơi, nhưng bạn trả tiền cho 41 ghế trống.
Đi một chiếc xe máy: rẻ, nhưng ba người ở lại. Một chiếc ô tô bốn chỗ là vừa.

### Thuật ngữ
- **Cost per month** (chi phí mỗi tháng): tổng tiền thuê các thành phần. Trong phòng thí nghiệm,
  1 vCPU máy web giá $22,5/tháng (giá của thế giới mô phỏng).
- **Right-sizing** (chọn cỡ vừa): chọn cấu hình nhỏ nhất đạt yêu cầu với khoảng dự phòng hợp lý.
- **Over-provisioning** (cấp dư): thuê nhiều hơn mức cần, trả tiền cho phần không dùng.
- **Unit cost** (chi phí đơn vị): chi phí cho mỗi nghìn yêu cầu hay mỗi người dùng; giúp so sánh
  thiết kế công bằng.

### Hiểu lầm thường gặp
- **M1.** "Mua máy to nhất cho chắc." Trả gấp bốn để nhanh hơn vài mili giây không ai nhận ra.
- **M2.** "Rẻ nhất chạy được là tốt nhất." Chạy được lúc vắng, sập lúc đông; sự cố còn đắt hơn.
- **M3.** "Dư thêm một ít 'cho chắc' thì không sao." Nếu không có lý do bằng số, đó vẫn là tiền thừa.

### Thí nghiệm
**Bối cảnh:** 12.000 yêu cầu/giây. Bạn đang chạy một máy 8 vCPU ($180/tháng). Sếp hỏi: "Có cần to vậy
không?" Ngân sách mới: $50/tháng.

**Dự đoán:** Cấu hình nhỏ nhất đạt `p95 ≤ 20 ms` là bao nhiêu vCPU?

**Mục tiêu:** `p95 ≤ 20 ms`, `requestsRejected = 0`, `chi phí ≤ $50/tháng`.

| Lựa chọn | vCPU | p95 dự kiến | Chi phí | Kết quả |
|---|---|---|---|---|
| A (đúng) | 2 | khoảng 6,5 ms | $45 | đạt, bận khoảng 67% |
| B | 8 | khoảng 2,9 ms | $180 | ✗ vượt ngân sách |
| C | 1 | khoảng 485 ms, bị từ chối | $22,5 | ✗ quá tải |
| D | 3 | khoảng 4,1 ms | $67,5 | ✗ vượt ngân sách |

### Phản hồi cho lựa chọn sai
- **B:** Nhanh hơn A khoảng 3,6 ms — người dùng không thể nhận ra — nhưng đắt gấp bốn. Máy rảnh hơn
  80% thời gian.
- **C:** Rẻ nhất, nhưng 12.000 yêu cầu/giây vượt sức chứa khoảng 9.000 của 1 vCPU. Hàng đợi đầy, yêu
  cầu bị từ chối. Tiết kiệm $22,5 mà mất khách.
- **D:** 3 vCPU không sai về kỹ thuật, nhưng bạn trả thêm $22,5 mỗi tháng cho khoảng 2 ms. Nếu muốn
  thêm dự phòng, hãy nêu lý do bằng số (ví dụ "đỉnh tải có thể gấp 1,5 lần").

### Điều cần nhớ
- Chi phí là một mục tiêu như độ trễ và tính sẵn sàng.
- Chọn cấu hình nhỏ nhất đạt mục tiêu với dự phòng có lý do.
- So sánh thiết kế bằng chi phí đơn vị, không chỉ bằng tổng hóa đơn.

### Câu hỏi ôn tập
1. Hai thiết kế cùng đạt mục tiêu: $45 và $67,5 mỗi tháng. Khi nào nên chọn cái đắt hơn? *(Khi có lý
   do bằng số, ví dụ dự báo tăng tải hoặc cần chịu được mất một máy.)*
2. 12.000 yêu cầu/giây trong một tháng 30 ngày là khoảng bao nhiêu tỉ yêu cầu? Với $45/tháng, mỗi
   triệu yêu cầu tốn bao nhiêu? *(Khoảng 31 tỉ; khoảng $0,0014 mỗi triệu.)*
3. Vì sao máy bận 15% cả ngày là dấu hiệu lãng phí? *(Phần lớn sức chứa trả tiền mà không dùng.)*

---

# English

## Cost is a requirement too

### Outcome
Pick the cheapest configuration that still meets the speed goal, and explain why both "the biggest"
and "the cheapest" are wrong answers.

### Prerequisites
`l0-throughput-and-capacity`

### Picture it first
Four friends go to dinner. Rent a 45-seat bus: everyone arrives, but you pay for 41 empty seats. Take
one scooter: cheap, but three friends stay home. A four-seat car is just right.

### Terms
- **Cost per month**: the total rent for all components. In the lab one web vCPU costs $22.5/month
  (a game-world price).
- **Right-sizing**: choosing the smallest configuration that meets the requirements with sensible
  headroom.
- **Over-provisioning**: renting more than needed and paying for unused capacity.
- **Unit cost**: cost per thousand requests or per user; lets you compare designs fairly.

### Misconceptions
- **M1.** "Buy the biggest machine to be safe." Paying four times as much for milliseconds nobody
  notices.
- **M2.** "The cheapest thing that runs is best." It runs when quiet and falls over when busy; outages
  cost more.
- **M3.** "A little extra 'just in case' is harmless." Without a numeric reason, it is still waste.

### Experiment
**Setup:** 12,000 requests/s. You run one 8-vCPU server ($180/month). Your manager asks: "Do we need
it that big?" New budget: $50/month.

**Predict:** What is the smallest vCPU count that keeps `p95 ≤ 20 ms`?

**Goals:** `p95 ≤ 20 ms`, `requestsRejected = 0`, `cost ≤ $50/month`.

| Choice | vCPU | Expected p95 | Cost | Result |
|---|---|---|---|---|
| A (correct) | 2 | about 6.5 ms | $45 | pass, about 67% busy |
| B | 8 | about 2.9 ms | $180 | ✗ over budget |
| C | 1 | about 485 ms, rejecting | $22.5 | ✗ overloaded |
| D | 3 | about 4.1 ms | $67.5 | ✗ over budget |

### Feedback for wrong choices
- **B:** About 3.6 ms faster than A — no user can tell — at four times the price. The machine is idle
  over 80% of the time.
- **C:** Cheapest, but 12,000 requests/s exceeds the roughly 9,000 one vCPU can handle. The queue fills
  and requests are rejected. You saved $22.5 and lost customers.
- **D:** Not technically wrong, but you pay $22.5 more a month for about 2 ms. If you want extra
  headroom, state the reason in numbers (for example "peaks may reach 1.5×").

### Takeaways
- Cost is a goal like latency and availability.
- Choose the smallest configuration that meets the goals with justified headroom.
- Compare designs by unit cost, not just the total bill.

### Review questions
1. Two designs both meet the goals: $45 and $67.5 a month. When should you pick the dearer one? *(When
   there is a numeric reason, e.g. forecast growth or surviving the loss of a machine.)*
2. 12,000 requests/s over a 30-day month is about how many billion requests? At $45/month, what does a
   million requests cost? *(About 31 billion; about $0.0014 per million.)*
3. Why is a server that is 15% busy all day a sign of waste? *(Most of the capacity you pay for is
   unused.)*
