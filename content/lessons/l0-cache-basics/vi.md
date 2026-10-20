---
id: l0-cache-basics
title: "Cache: giữ bản sao gần tay"
---

## Mục tiêu
Tính được một cache đỡ cho cơ sở dữ liệu bao nhiêu ứng với một tỉ lệ trúng cho trước, và gọi tên
hai rủi ro của cache: dữ liệu cũ và lúc cache biến mất.

## Hình dung trước
Bạn nấu ăn mỗi ngày. Muối, nước mắm, tiêu để ngay trên kệ cạnh bếp; bao gạo thì cất trong kho. Kệ
bếp nhỏ nhưng với tay là tới; kho rộng nhưng phải đi một đoạn. Nếu chai nước mắm trên kệ đã hết mà
bạn không để ý, bạn vẫn tưởng là còn. Và nếu có ai dọn sạch kệ, món nào bạn cũng phải chạy vào kho
lấy.

## Thuật ngữ
- **Cache** (bộ nhớ đệm): một bản sao nhỏ và nhanh của dữ liệu vốn chậm hoặc tốn công lấy, thường
  nằm trong RAM (bộ nhớ làm việc của máy).
- **Cache hit** (trúng cache): dữ liệu có sẵn trong cache. **Cache miss** (trượt cache): không có,
  phải đi lấy từ nguồn, và thường cất lại một bản vào cache.
- **Hit ratio** (tỉ lệ trúng): số lần trúng ÷ tổng số lần tra.
- **TTL** (time to live, thời gian sống): bản sao được coi là còn mới trong bao lâu.
- **Eviction** (loại bỏ): bỏ bớt mục khi cache đầy. Ví dụ **LRU** (least recently used, lâu nhất
  chưa dùng) bỏ mục đã lâu nhất không ai dùng tới.
- **Source of truth** (nguồn sự thật): nơi giữ bản chính, thường là cơ sở dữ liệu. Cache chỉ giữ bản
  sao.

Vì sao cache nhanh: đọc bộ nhớ trong mất khoảng 100 nano giây, đọc ngẫu nhiên từ ổ SSD khoảng 16
micro giây, còn một vòng đi về trong cùng trung tâm dữ liệu khoảng 0,5 mili giây.

## Hiểu lầm thường gặp
- **M1**: "Cache giữ mọi thứ mãi mãi." Cache có giới hạn dung lượng, và bản sao có hạn dùng.
- **M2**: "Cache chỉ là một cơ sở dữ liệu nhanh hơn." Nó là bản sao; bản chính nằm ở chỗ khác.
- **M3**: "Thêm cache thì chỉ có lợi." Cache có thể trả dữ liệu cũ, và khi nó sập thì toàn bộ lượt
  đọc dội thẳng vào cơ sở dữ liệu cùng lúc.

## Bước 1: quan sát
Một trang sản phẩm nhận 10.000 lượt đọc mỗi giây. Không có cache, cơ sở dữ liệu nhận 10.000 truy
vấn mỗi giây.

## Bước 2: phân tích
Đặt một cache trước cơ sở dữ liệu với tỉ lệ trúng 90%:

- 9.000 lượt đọc mỗi giây được cache trả lời.
- Chỉ 1.000 lượt mỗi giây (10%) đi xuống cơ sở dữ liệu.

Tỉ lệ trúng 99% thì chỉ còn 100 lượt mỗi giây xuống cơ sở dữ liệu. Mỗi "số 9" thêm vào giảm tải cho
cơ sở dữ liệu đi mười lần.

## Bước 3: áp dụng
Giá một sản phẩm đổi lúc 10:00, TTL của cache là 5 phút. Đến 10:03 khách vẫn thấy giá cũ: đó là
**stale read** (đọc phải dữ liệu cũ). Bạn có hai cách: rút ngắn TTL (nhiều lượt đọc xuống cơ sở dữ
liệu hơn), hoặc xóa mục trong cache mỗi khi đổi giá (và phải nhớ làm ở mọi chỗ). Cấp L2 sẽ đi sâu
hơn.

## Câu hỏi
Đạt khi trả lời đúng 4 trên 5 câu.

- **q1**: Mỗi giây có 20.000 lượt đọc, tỉ lệ trúng là 95%. Mỗi giây có bao nhiêu truy vấn xuống cơ
  sở dữ liệu?
- **q2**: Cache khởi động lại và trống trơn. Chuyện gì xảy ra với cơ sở dữ liệu?
- **q2.a**: Không có gì thay đổi, nó vẫn chịu tải như thường.
- **q2.b**: Gần như mọi lượt đọc đột ngột dội vào nó cùng lúc.
- **q2.c**: Trang web ngừng hẳn, vì dữ liệu chỉ nằm trong cache.
- **q3**: TTL dài có lợi gì và hại gì?
- **q3.a**: Trúng nhiều hơn, nhưng dữ liệu đã đổi sẽ cũ lâu hơn.
- **q3.b**: Trúng ít hơn, nhưng dữ liệu luôn mới.
- **q3.c**: Chẳng ảnh hưởng gì.
- **q4**: Vì sao cache thường nằm trong RAM?
- **q4.a**: RAM rẻ hơn ổ đĩa tính theo mỗi GB.
- **q4.b**: RAM vẫn giữ dữ liệu khi mất điện.
- **q4.c**: Đọc RAM nhanh hơn ổ đĩa hay một chuyến đi qua mạng hàng trăm, hàng nghìn lần.
- **q5**: Đúng hay sai: cache giữ bản chính của dữ liệu.
- **q5.a**: Đúng.
- **q5.b**: Sai.

## Phản hồi
- **q2**: Khi cache còn đầy, nó đỡ phần lớn lượt đọc. Trống trơn thì lần nào cũng trượt, nên trong
  một lúc cơ sở dữ liệu phải gánh toàn bộ lượng tải mà trước đó cache che chắn. Đó là rủi ro thứ hai
  mà cache nào cũng mang theo.
- **q3**: Một mục trong cache sống cho tới khi hết TTL hoặc bị loại bỏ. TTL dài giữ được nhiều câu
  trả lời hơn nên trúng nhiều hơn, nhưng thay đổi ở nguồn sẽ bị che lâu hơn.
- **q5**: Cache là bản sao để dùng cho tiện. Bản chính nằm ở nguồn sự thật, thường là cơ sở dữ liệu,
  nên có thể xóa sạch cache mà không mất dữ liệu.

## Điều cần nhớ
- Cache là một bản sao dữ liệu nhỏ, nhanh và có hạn dùng.
- Tỉ lệ trúng quyết định cơ sở dữ liệu được đỡ bao nhiêu.
- Luôn đi kèm hai rủi ro: dữ liệu cũ và cache biến mất.

## Câu hỏi ôn tập
1. Phân biệt cache hit với cache miss.
2. LRU loại bỏ mục nào?
3. Kể ba chỗ một yêu cầu web có thể gặp cache. *(Trình duyệt, DNS, CDN, cache của ứng dụng, bên
   trong cơ sở dữ liệu.)*

## Sắp có: thí nghiệm
Khi phòng thí nghiệm có thành phần cache, bài này sẽ thành thí nghiệm: người dùng → web → cache → cơ
sở dữ liệu, 12.000 lượt đọc mỗi giây. Thêm một cache đủ lớn giữ cho cơ sở dữ liệu nhàn; mua cơ sở dữ
liệu to hơn cũng được nhưng tốn tiền hơn; cache quá nhỏ thì gần như không giúp gì. Một sự cố tắt
cache sẽ cho thấy rủi ro thứ hai ngay trước mắt.
