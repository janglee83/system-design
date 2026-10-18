---
id: l0-availability-nines
level: L0
format: reading+check
minutes: 12
difficulty: 2
prerequisites: [l0-single-point-of-failure]
research: [content/research/availability-and-spof.md]
engine_readiness: not-needed
engine_gaps: []
status: draft
---

# Check spec (shared)

Reading lesson with calculations. A calculator widget converts an availability percentage into
downtime per year/month/week. Pass with 4 of 5. Optional link back to the SPOF experiment to compare
measured availability (request-based) with the formulas here.

---

# Tiếng Việt

## Tính sẵn sàng và những con số 9

### Mục tiêu
Quy đổi một mục tiêu như "99,9%" thành số phút ngừng hoạt động mỗi năm, và tính tỉ lệ sẵn sàng của
một chuỗi phụ thuộc và của hai bản dự phòng.

### Cần học trước
`l0-single-point-of-failure`

### Hình dung trước
Một quán cà phê hứa "mở cửa 99% thời gian". Nghe gần như luôn mở — nhưng 1% của một năm là hơn ba
ngày rưỡi đóng cửa. Nếu quán cần cả điện, nước và máy pha cùng chạy thì cơ hội mở cửa còn thấp hơn
nữa; nếu có hai máy pha thì cơ hội cao hơn.

### Thuật ngữ
- **Availability** (tính sẵn sàng): phần thời gian (hoặc phần yêu cầu) mà dịch vụ làm đúng việc của
  nó. Theo yêu cầu: số yêu cầu thành công ÷ số yêu cầu hợp lệ.
- **"Số chín"**: cách gọi tắt. "Ba số chín" = 99,9%; "năm số chín" = 99,999%.
- **Hard dependency** (phụ thuộc cứng): thành phần mà nếu nó ngừng thì dịch vụ của bạn cũng ngừng.
- **MTBF** (mean time between failures, thời gian trung bình giữa hai lần hỏng) và **MTTR** (mean
  time to recover, thời gian trung bình để khôi phục). Sẵn sàng ≈ MTBF ÷ (MTBF + MTTR).
- **Error budget** (ngân sách lỗi): phần không sẵn sàng được phép, ví dụ 0,1% với mục tiêu 99,9%.

### Bảng cần nhớ

| Mục tiêu | Ngừng tối đa mỗi năm |
|---|---|
| 99% | khoảng 3 ngày 15 giờ |
| 99,9% | khoảng 8 giờ 45 phút |
| 99,95% | khoảng 4 giờ 22 phút |
| 99,99% | khoảng 52 phút |
| 99,999% | khoảng 5 phút |

### Hiểu lầm thường gặp
- "99% là gần hoàn hảo." Đó là hơn ba ngày rưỡi ngừng mỗi năm.
- "Ghép nhiều dịch vụ 99,99% lại thì vẫn 99,99%." Phụ thuộc nối tiếp làm tỉ lệ nhân lại và giảm đi.
- "Muốn thêm một số chín thì chỉ tốn thêm một chút." Mỗi số chín thêm vào thường đắt hơn số trước
  rất nhiều.

### Bước 1 — Quan sát: chuỗi phụ thuộc
Dịch vụ của bạn sẵn sàng 99,99% và cần hai dịch vụ khác, mỗi dịch vụ 99,99%. Tốt nhất có thể:
0,9999 × 0,9999 × 0,9999 ≈ 99,97%.

### Bước 2 — Phân tích: dự phòng
Hai bản độc lập, mỗi bản 99,9%, chỉ cần một bản chạy là đủ: xác suất cả hai cùng hỏng là
0,001 × 0,001 = 0,000001, nên sẵn sàng ≈ 99,9999%. Điều kiện quan trọng: hai bản phải **hỏng độc
lập** — không chung giá đỡ, chung nguồn điện, chung lỗi phần mềm.

### Bước 3 — Áp dụng
Một máy hỏng trung bình 150 ngày một lần và mất 1 giờ để khôi phục. Sẵn sàng ≈ 3.600 giờ ÷ (3.600 +
1) ≈ 99,97%. Rút thời gian khôi phục xuống 6 phút thì lên khoảng 99,997%: khôi phục nhanh hơn cũng
quý như hỏng ít hơn.

### Kiểm tra (đạt khi đúng 4/5)
1. 99,9% cho phép ngừng khoảng bao lâu mỗi năm? *(Khoảng 8 giờ 45 phút.)*
2. Dịch vụ cần ba phụ thuộc cứng, mỗi cái 99,9%. Tỉ lệ tốt nhất? *(0,999³ ≈ 99,7%.)*
3. Hai bản độc lập 99%, chỉ cần một bản chạy. Tỉ lệ? *(1 − 0,01² = 99,99%.)*
4. Vì sao hai máy trong cùng một giá đỡ không thật sự "độc lập"? *(Mất điện hay hỏng mạng ở giá đỡ
   làm cả hai cùng ngừng.)*
5. Trong 1.000.000 yêu cầu, 99,95% nghĩa là tối đa bao nhiêu yêu cầu lỗi? *(500.)*

### Điều cần nhớ
- Đổi phần trăm ra thời gian ngừng để thấy con số thật.
- Phụ thuộc nối tiếp nhân xác suất và kéo tỉ lệ xuống; bản dự phòng độc lập kéo tỉ lệ lên.
- Khôi phục nhanh quan trọng không kém hỏng ít.

### Câu hỏi ôn tập
1. Viết công thức sẵn sàng theo MTBF và MTTR.
2. Ngân sách lỗi của mục tiêu 99,99% trong một tháng 30 ngày là bao nhiêu phút? *(Khoảng 4,3 phút.)*
3. Vì sao mục tiêu 100% thường là sai? *(Quá đắt, người dùng không phân biệt được, và chính mạng/thiết
   bị của họ cũng không đạt 100%.)*

---

# English

## Availability and the nines

### Outcome
Convert a target such as "99.9%" into minutes of downtime per year, and compute the availability of
a chain of dependencies and of two redundant copies.

### Prerequisites
`l0-single-point-of-failure`

### Picture it first
A café promises to be "open 99% of the time". Sounds like always — but 1% of a year is more than
three and a half days closed. If the café needs power, water and the espresso machine all working,
its chances of being open are lower still; with two espresso machines, they go up.

### Terms
- **Availability**: the share of time (or of requests) the service does its job. Request-based:
  successful requests ÷ valid requests.
- **"Nines"**: shorthand. "Three nines" = 99.9%; "five nines" = 99.999%.
- **Hard dependency**: a component whose outage means your service is out too.
- **MTBF** (mean time between failures) and **MTTR** (mean time to recover). Availability ≈ MTBF ÷
  (MTBF + MTTR).
- **Error budget**: the allowed unavailability, e.g. 0.1% for a 99.9% target.

### Table to remember

| Target | Max downtime per year |
|---|---|
| 99% | about 3 days 15 hours |
| 99.9% | about 8 hours 45 minutes |
| 99.95% | about 4 hours 22 minutes |
| 99.99% | about 52 minutes |
| 99.999% | about 5 minutes |

### Misconceptions
- "99% is nearly perfect." It is more than three and a half days down a year.
- "Combine several 99.99% services and you still have 99.99%." Serial dependencies multiply and
  shrink.
- "One more nine costs a bit more." Each extra nine usually costs far more than the previous one.

### Step 1 — Observe: a chain of dependencies
Your service is 99.99% available and needs two others, each 99.99%. Best case:
0.9999 × 0.9999 × 0.9999 ≈ 99.97%.

### Step 2 — Analyse: redundancy
Two independent copies at 99.9% each, where one is enough: both fail together with probability
0.001 × 0.001 = 0.000001, so availability ≈ 99.9999%. The key condition is **independent failure** —
no shared rack, power or software bug.

### Step 3 — Apply
A machine fails on average every 150 days and takes 1 hour to recover. Availability ≈ 3,600 hours ÷
(3,600 + 1) ≈ 99.97%. Cut recovery to 6 minutes and it rises to about 99.997%: recovering faster is
worth as much as failing less.

### Check (pass with 4 of 5)
1. How much downtime per year does 99.9% allow? *(About 8 hours 45 minutes.)*
2. A service has three hard dependencies at 99.9% each. Best case? *(0.999³ ≈ 99.7%.)*
3. Two independent copies at 99%, one is enough. Availability? *(1 − 0.01² = 99.99%.)*
4. Why are two servers in the same rack not truly "independent"? *(A rack power or network failure
   takes both down.)*
5. Out of 1,000,000 requests, how many may fail at 99.95%? *(500.)*

### Takeaways
- Turn percentages into downtime to see the real number.
- Serial dependencies multiply and pull availability down; independent copies pull it up.
- Recovering fast matters as much as failing rarely.

### Review questions
1. Write availability in terms of MTBF and MTTR.
2. What is the error budget of a 99.99% target over a 30-day month, in minutes? *(About 4.3 minutes.)*
3. Why is 100% usually the wrong target? *(Too expensive, users cannot tell the difference, and their
   own networks and devices are not 100% either.)*
