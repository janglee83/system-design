---
id: l0-throughput-and-capacity
title: Thông lượng và sức chứa của một máy chủ
---

## Mục tiêu
Nhìn số yêu cầu mỗi giây và sức chứa của máy chủ, chọn được cấu hình để không yêu cầu nào bị từ
chối và p95 dưới 50 ms; giải thích được vì sao thêm bộ nhớ hay cho chờ lâu hơn không chữa được quá
tải.

## Hình dung trước
Một quán phở có một đầu bếp, nấu được 90 tô mỗi phút. Giờ trưa, mỗi phút có 120 khách bước vào.
Kê thêm ghế chờ (bộ nhớ) chỉ làm hàng người chờ dài thêm. Dặn khách "cứ chờ thêm chút nữa"
(timeout dài) cũng vậy. Chỉ khi có thêm một đầu bếp, hoặc một đầu bếp nhanh tay hơn, bếp mới ra
nhiều tô hơn mỗi phút.

## Thuật ngữ
- **Throughput** (thông lượng): số việc làm xong mỗi giây, đo bằng **rps** (requests per second,
  số yêu cầu mỗi giây).
- **Capacity** (sức chứa): thông lượng cao nhất mà một thành phần giữ được lâu dài.
- **vCPU** (CPU ảo): một đơn vị sức xử lý thuê trên đám mây. Trong phòng thí nghiệm, 1 vCPU xử lý
  xong khoảng 9.000 yêu cầu đơn giản mỗi giây. Đây là con số của thế giới mô phỏng, không phải kết
  quả đo máy thật.
- **Queue** (hàng đợi): nơi yêu cầu xếp hàng khi máy chủ đang bận. Trong phòng thí nghiệm, bộ nhớ
  quyết định hàng chứa được bao nhiêu: khoảng 4.000 yêu cầu cho mỗi GB.
- **Rejected** (bị từ chối): yêu cầu bị bỏ vì hàng đợi đã đầy.
- **Timeout** (thời gian chờ tối đa): client chờ bao lâu thì bỏ cuộc.
- **p95**: 95% yêu cầu xong nhanh bằng hoặc hơn con số này. Bài về phân vị sẽ nói kỹ.
- **peakBusy**: lúc bận nhất, máy chủ dùng bao nhiêu phần sức của nó (từ 0 đến 1).

## Hiểu lầm thường gặp
- **M1**: "Thêm RAM thì máy chủ xử lý được nhiều yêu cầu hơn mỗi giây." Bộ nhớ chỉ làm hàng chờ dài
  hơn.
- **M2**: "Yêu cầu chậm thì tăng thời gian chờ của client lên." Chờ lâu hơn không thêm chút sức xử
  lý nào.
- **M3**: "Vượt sức chứa một chút cũng không sao." Phần dư dồn lại từng giây cho tới khi hàng đợi
  đầy.

## Thí nghiệm
**Bối cảnh:** mỗi giây có 12.000 yêu cầu đến một máy chủ 1 vCPU, 2 GB RAM. Sức chứa của nó khoảng
9.000 rps. Bạn chỉnh được số vCPU (1, 2 hoặc 4), RAM (2 hoặc 8 GB) và timeout của client (1 giây
hoặc 5 giây).

**Dự đoán trước khi chạy:** với 1 vCPU, mỗi giây dư ra bao nhiêu yêu cầu, và một phòng chờ khoảng
8.000 chỗ thì bao lâu sẽ đầy? *(Dư khoảng 3.000 yêu cầu mỗi giây, nên chưa tới 3 giây là đầy.)*

**Mục tiêu:** p95 không quá 50 ms và không yêu cầu nào bị từ chối.

| Lựa chọn | vCPU | RAM | Timeout | Phòng thí nghiệm cho thấy |
|---|---|---|---|---|
| A | 2 | 2 GB | 1 giây | p95 khoảng 5 ms, không bị từ chối, lúc đỉnh bận khoảng 88% |
| B | 1 | 8 GB | 1 giây | không bị từ chối, nhưng p95 trên 3 giây và phần lớn yêu cầu hết giờ |
| C | 1 | 2 GB | 5 giây | p95 gần 1 giây, hơn 20.000 yêu cầu bị từ chối |
| D | 1 | 2 GB | 1 giây | giống C, có thêm sự kiện `node.overloaded` |

Ở lựa chọn D, hãy xem dòng thời gian: hàng đợi leo dần, chạm trần rồi nằm đó, và chỉ vài giây sau
là bắt đầu có yêu cầu bị từ chối.

## Phản hồi
- **B**: RAM gấp bốn thì hàng chờ dài gấp bốn. Máy vẫn chỉ xử lý xong khoảng 9.000 yêu cầu mỗi
  giây, nên người đứng cuối hàng phải chờ hơn một giây và client bỏ cuộc. Không yêu cầu nào "bị từ
  chối", nhưng phần lớn người dùng vẫn thất bại: bạn đã đổi một lời "không" nhanh lấy một lần chờ
  dài rồi hỏng.
- **C**: Chờ lâu hơn không làm bếp nấu nhanh hơn. Hàng đợi vẫn đầy, máy vẫn từ chối, còn timeout dài
  chỉ giữ người dùng lơ lửng lâu hơn trước khi thất bại. Các con số y hệt lựa chọn D.
- **D**: Dư 3.000 yêu cầu mỗi giây nghe nhỏ so với 12.000, nhưng không có gì xử lý bớt phần dư đó.
  Nó dồn lại cho tới khi hàng đợi đầy, và từ lúc đó máy từ chối phần tràn ra. Quá tải không phải là
  "chậm một chút"; nó tích tụ.

## Điều cần nhớ
- Sức chứa đến từ thứ thật sự làm việc (ở đây là CPU), không đến từ phòng chờ (RAM).
- Khi lượng đến cứ cao hơn sức chứa, hàng đợi lớn dần cho tới khi đầy; sau đó là bị từ chối hoặc
  hết giờ.
- Tăng timeout che giấu quá tải chứ không chữa được nó.

## Câu hỏi ôn tập
1. Thông lượng khác độ trễ ở đâu? *(Một bên là bao nhiêu việc xong mỗi giây, bên kia là một yêu cầu
   mất bao lâu.)*
2. Máy 2 vCPU trong phòng thí nghiệm xử lý được khoảng bao nhiêu rps? *(Khoảng 18.000.)*
3. Vì sao thêm RAM lại làm p95 tệ hơn ở lựa chọn B? *(Hàng dài hơn thì người cuối hàng chờ lâu
   hơn.)*
4. Lượng đến vượt sức chứa 3.000 rps và hàng đợi chứa được 6.000 yêu cầu. Bao lâu thì đầy? *(Khoảng
   2 giây.)*
