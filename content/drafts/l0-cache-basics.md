---
id: l0-cache-basics
level: L0
format: reading+check
minutes: 12
difficulty: 1
prerequisites: [l0-database-basics, l0-latency-and-distance]
research: [content/research/caching-basics.md]
engine_readiness: not-needed
experiment_upgrade: needs-1b
engine_gaps: []
status: draft
upgrade: Becomes an experiment when the `redis` component ships (planned, spec §6.2). Planned experiment in the appendix.
---

# Check spec (shared)

Reading lesson with a pencil-and-paper calculation. Pass with 4 of 5. Appendix: the experiment we
will turn on when `redis` exists.

---

# Tiếng Việt

## Cache: giữ bản sao gần tay

### Mục tiêu
Tính được cache làm giảm bao nhiêu tải cho cơ sở dữ liệu khi biết tỉ lệ trúng, và nêu hai rủi ro
của cache: dữ liệu cũ và lúc cache biến mất.

### Cần học trước
`l0-database-basics`, `l0-latency-and-distance`

### Hình dung trước
Bạn nấu ăn mỗi ngày. Muối, nước mắm, tiêu để ngay trên kệ cạnh bếp; bao gạo dự trữ để trong kho.
Kệ bếp nhỏ nhưng với tay là tới; kho rộng nhưng phải đi xa. Nếu chai nước mắm trên kệ hết mà bạn
không để ý, bạn vẫn tưởng là còn. Và nếu ai đó dọn sạch kệ, bạn phải chạy vào kho cho từng món.

### Thuật ngữ
- **Cache** (bộ nhớ đệm): một bản sao nhỏ, nhanh của dữ liệu vốn chậm hoặc tốn công lấy. Thường nằm
  trong RAM (bộ nhớ trong).
- **Cache hit** (trúng cache): dữ liệu có sẵn trong cache. **Cache miss** (trượt): không có, phải đi
  lấy từ nguồn rồi thường cất một bản vào cache.
- **Hit ratio** (tỉ lệ trúng): số lần trúng ÷ tổng số lần hỏi.
- **TTL** (time to live, thời gian sống): bản sao được coi là còn mới trong bao lâu.
- **Eviction** (loại bỏ): khi cache đầy, bỏ bớt mục; ví dụ **LRU** (least recently used) bỏ mục lâu
  nhất không dùng.
- **Source of truth** (nguồn sự thật): nơi giữ bản chính, thường là cơ sở dữ liệu. Cache chỉ là bản
  sao.

Vì sao cache nhanh: đọc bộ nhớ trong mất khoảng 100 nano giây; đọc ngẫu nhiên từ ổ SSD khoảng
16 micro giây; một vòng đi–về trong cùng trung tâm dữ liệu khoảng 0,5 mili giây.

### Hiểu lầm thường gặp
- "Cache giữ mọi thứ mãi mãi." Cache có giới hạn và bản sao có hạn dùng.
- "Cache chỉ là một cơ sở dữ liệu nhanh hơn." Nó là bản sao; bản chính ở chỗ khác.
- "Thêm cache thì chỉ có lợi." Có thể trả dữ liệu cũ; và khi cache sập, toàn bộ lượng đọc dội thẳng
  vào cơ sở dữ liệu.

### Bước 1 — Quan sát
Một trang sản phẩm nhận 10.000 lượt đọc/giây. Không có cache: cơ sở dữ liệu nhận 10.000 truy
vấn/giây.

### Bước 2 — Phân tích
Đặt cache trước cơ sở dữ liệu với tỉ lệ trúng 90%:
- 9.000 lượt/giây được trả từ cache.
- Chỉ 1.000 lượt/giây (10%) đi xuống cơ sở dữ liệu.
Tỉ lệ trúng 99% → chỉ 100 lượt/giây xuống cơ sở dữ liệu. Mỗi "số 9" thêm vào giảm tải cho cơ sở dữ
liệu đi mười lần.

### Bước 3 — Áp dụng
Giá sản phẩm đổi lúc 10:00, TTL của cache là 5 phút. Đến 10:03 khách vẫn thấy giá cũ. Đây là
**stale read** (đọc phải dữ liệu cũ). Bạn có hai cách: rút ngắn TTL (đọc xuống cơ sở dữ liệu nhiều
hơn) hoặc xóa mục trong cache ngay khi đổi giá (phải nhớ làm đúng mọi chỗ). Cấp L2 sẽ đi sâu.

### Kiểm tra (đạt khi đúng 4/5)
1. 20.000 lượt đọc/giây, tỉ lệ trúng 95%. Cơ sở dữ liệu nhận bao nhiêu? *(1.000/giây.)*
2. Cache bị khởi động lại, tạm thời trống. Điều gì xảy ra với cơ sở dữ liệu? *(Gần như toàn bộ lượng
   đọc dội xuống nó cùng lúc.)*
3. TTL dài có lợi và hại gì? *(Lợi: trúng nhiều hơn; hại: dữ liệu cũ lâu hơn.)*
4. Vì sao cache thường nằm trong RAM? *(RAM nhanh hơn ổ đĩa và mạng nhiều bậc.)*
5. Đúng hay sai: cache là nơi giữ bản chính của dữ liệu. *(Sai.)*

### Điều cần nhớ
- Cache là bản sao nhanh, nhỏ, có hạn dùng của dữ liệu.
- Tỉ lệ trúng quyết định cơ sở dữ liệu được nhẹ đi bao nhiêu.
- Hai rủi ro luôn đi kèm: dữ liệu cũ và lúc cache biến mất.

### Câu hỏi ôn tập
1. Phân biệt cache hit và cache miss.
2. LRU loại bỏ mục nào?
3. Kể ba nơi có cache trên đường đi của một yêu cầu web. *(Trình duyệt, DNS, CDN, cache ứng dụng, bên
   trong cơ sở dữ liệu.)*

### Phụ lục — thí nghiệm sẽ bật khi có `redis`
Người dùng → web → `redis` (cạnh `cache`) → `pg`. 12.000 lượt đọc/giây, `writeRatio` 0,05. Mục
tiêu: `peakDbConnections` thấp và `p95 ≤ 20 ms`. Lựa chọn đúng: thêm cache đủ lớn. Lựa chọn sai:
nâng cỡ cơ sở dữ liệu (đắt hơn, vẫn đạt nhưng vượt ngân sách); cache quá nhỏ (tỉ lệ trúng thấp, cơ
sở dữ liệu vẫn quá tải). Lỗi `cache-down` minh họa rủi ro thứ hai.

---

# English

## Caches: keeping a copy within reach

### Outcome
Compute how much a cache relieves the database for a given hit ratio, and name a cache's two risks:
stale data and the moment the cache disappears.

### Prerequisites
`l0-database-basics`, `l0-latency-and-distance`

### Picture it first
You cook every day. Salt, fish sauce and pepper sit on the shelf by the stove; the rice sack lives in
the storeroom. The shelf is small but within reach; the storeroom is big but a walk away. If the
fish sauce bottle on the shelf runs out and you do not notice, you still think you have some. And if
someone clears the shelf, you are back to fetching every item from the storeroom.

### Terms
- **Cache**: a small, fast copy of data that is slow or costly to fetch, usually kept in RAM.
- **Cache hit**: the data is in the cache. **Cache miss**: it is not; fetch it from the source and
  usually keep a copy.
- **Hit ratio**: hits ÷ all lookups.
- **TTL** (time to live): how long a copy counts as fresh.
- **Eviction**: removing entries when the cache is full; e.g. **LRU** (least recently used) drops
  what has gone unused longest.
- **Source of truth**: where the master copy lives, usually the database. The cache is only a copy.

Why caches are fast: a memory read takes about 100 nanoseconds; a random SSD read about 16
microseconds; a round trip inside one data centre about 0.5 milliseconds.

### Misconceptions
- "A cache keeps everything forever." It is bounded and copies expire.
- "A cache is just a faster database." It is a copy; the master copy lives elsewhere.
- "Adding a cache can only help." It can serve stale data, and when it fails, every read lands on the
  database at once.

### Step 1 — Observe
A product page gets 10,000 reads/s. With no cache, the database receives 10,000 queries/s.

### Step 2 — Analyse
Put a cache in front of the database with a 90% hit ratio:
- 9,000 reads/s are answered by the cache.
- Only 1,000 reads/s (10%) reach the database.
At 99% hits, only 100 reads/s reach the database. Each extra "nine" cuts database load tenfold.

### Step 3 — Apply
A product's price changes at 10:00 and the cache TTL is 5 minutes. At 10:03 shoppers still see the
old price — a **stale read**. Two options: a shorter TTL (more reads hit the database), or delete the
cache entry when the price changes (you must remember to do it everywhere). L2 goes deeper.

### Check (pass with 4 of 5)
1. 20,000 reads/s at a 95% hit ratio. How many reach the database? *(1,000/s.)*
2. The cache restarts empty. What happens to the database? *(Almost all reads hit it at once.)*
3. Upside and downside of a long TTL? *(More hits; data stays stale longer.)*
4. Why do caches usually live in RAM? *(RAM is orders of magnitude faster than disk or network.)*
5. True or false: the cache holds the master copy of the data. *(False.)*

### Takeaways
- A cache is a small, fast, expiring copy of data.
- The hit ratio decides how much the database is relieved.
- Two risks always come along: stale data and the cache disappearing.

### Review questions
1. Tell a cache hit from a cache miss.
2. Which entry does LRU evict?
3. Name three places a web request may meet a cache. *(Browser, DNS, CDN, application cache, inside the
   database.)*

### Appendix — experiment to enable when `redis` ships
users → web → `redis` (`cache` edge) → `pg`. 12,000 reads/s, `writeRatio` 0.05. Goals: low
`peakDbConnections` and `p95 ≤ 20 ms`. Correct: add a large-enough cache. Wrong: buy a bigger database
(passes but over budget); a tiny cache (low hit ratio, database still overloaded). The `cache-down`
fault demonstrates the second risk.
