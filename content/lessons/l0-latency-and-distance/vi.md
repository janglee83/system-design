---
id: l0-latency-and-distance
title: "Độ trễ: vì sao ở xa thì chậm"
---

## Mục tiêu
Chọn vị trí đặt máy chủ để 95% người dùng nhận phản hồi trong vòng 100 ms, và chứng minh bằng
số liệu rằng mua máy mạnh hơn không bù được khoảng cách.

## Hình dung trước
Bạn đặt một món đồ từ cửa hàng cùng quận: chiều là có. Đặt cùng món đó từ nước ngoài: cả tuần. Cửa
hàng nước ngoài đóng gói nhanh gấp mười cũng không làm máy bay bay nhanh hơn. Trên Internet cũng
vậy: tín hiệu chạy trong cáp quang chỉ nhanh chừng đó.

## Thuật ngữ
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

## Hiểu lầm thường gặp
- **M1**: "Máy chủ mạnh hơn sẽ làm người dùng ở xa nhanh hơn." CPU chỉ rút ngắn thời gian xử lý,
  không rút ngắn đường cáp.
- **M2**: "Internet gần như tức thời, đặt máy chủ ở đâu cũng vậy." Vật lý nói khác.
- **M3**: "Băng thông lớn hơn là độ trễ thấp hơn." Hai đại lượng khác nhau.

## Thí nghiệm
**Bối cảnh:** Khách hàng của bạn ở Đông Nam Á, 2.000 yêu cầu/giây. Máy chủ hiện đặt ở "bên kia địa
cầu". Bạn có hai nút điều khiển: **vị trí máy chủ** (cùng thành phố / cùng châu lục / bên kia địa
cầu) và **số vCPU** (1 hoặc 8).

**Dự đoán trước khi chạy:** nếu giữ máy ở bên kia địa cầu nhưng tăng lên 8 vCPU, p95 giảm từ khoảng
165 ms xuống còn bao nhiêu? *(Không giảm chút nào: vẫn khoảng 165 ms.)*

**Mục tiêu:** `p95 ≤ 100 ms`.

| Lựa chọn | Vị trí | vCPU | p95 dự kiến | Chi phí/tháng |
|---|---|---|---|---|
| A | cùng châu lục | 1 | khoảng 44 ms | $22,5 |
| B | bên kia địa cầu | 8 | khoảng 165 ms | $215 |
| C | bên kia địa cầu | 1 | khoảng 165 ms | $22,5 |

Đặt máy cùng thành phố cũng đạt (khoảng 6 ms). Cùng châu lục đã đủ cho mục tiêu này, và ngoài đời đó
thường là vùng bạn thuê được thật.

Mở **Follow request** ở lựa chọn B: phần lớn thời gian nằm trên cạnh mạng, không phải ở máy chủ.

## Phản hồi
- **B**: Bạn trả gần gấp mười lần tiền nhưng p95 không nhúc nhích. Máy chủ vốn chỉ mất khoảng 4 ms
  để xử lý; 160 ms còn lại là thời gian tín hiệu đi qua nửa vòng Trái Đất. Muốn nhanh, hãy đưa máy
  chủ (hoặc nội dung) lại gần người dùng.
- **C**: Ở đây máy chủ bận chưa tới một nửa (khoảng 42%), vậy mà p95 vẫn vượt 160 ms. Khoảng cách tự
  nó đã vượt ngân sách 100 ms.
- **M3**: Băng thông là lượng dữ liệu đi qua được mỗi giây; độ trễ là mẩu dữ liệu đầu tiên mất bao
  lâu mới tới. Đường ống to hơn giống con đường rộng hơn: chở được nhiều xe hơn, nhưng mỗi xe vẫn cần
  ngần ấy thời gian để chạy hết quãng đường. Phòng thí nghiệm chưa mô phỏng băng thông nên không có
  lựa chọn cho hiểu lầm này.

## Điều cần nhớ
- Độ trễ có một "sàn" do khoảng cách mà không phần cứng nào hạ được.
- Xem độ trễ nằm ở đâu (mạng hay máy chủ) trước khi chi tiền.
- Đưa máy chủ hoặc nội dung lại gần người dùng là cách giảm độ trễ hiệu quả nhất (CDN ở cấp L1).

## Câu hỏi ôn tập
1. Khoảng 1.000 km cáp quang thêm bao nhiêu ms một chiều? *(Khoảng 5 ms.)*
2. Vì sao 8 vCPU gần như không đổi p95 trong thí nghiệm? *(Thời gian xử lý chỉ khoảng 4 ms; phần
   lớn là đường truyền.)*
3. Băng thông và độ trễ khác nhau thế nào? *(Băng thông: bao nhiêu dữ liệu mỗi giây; độ trễ: chờ
   bao lâu.)*
4. Người dùng bắt đầu cảm thấy chậm từ khoảng bao nhiêu ms? *(Khoảng 100 ms.)*
