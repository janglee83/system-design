---
id: l0-estimation-basics
title: "Ước lượng nhanh: từ số người dùng đến số máy"
---

## Mục tiêu
Từ một đề bài có số người dùng mỗi ngày, tính được số yêu cầu mỗi giây lúc bình thường và lúc cao
điểm, rồi chọn cỡ máy chủ vẫn còn chỗ trống lúc cao điểm mà không vượt ngân sách.

## Hình dung trước
Bạn tổ chức tiệc cưới 300 khách. Bạn không đếm từng hạt gạo; bạn ước: mỗi khách ăn khoảng hai bát
cơm, giờ cao điểm là lúc khai tiệc, nên cần đủ bàn và người phục vụ cho lúc đó, cộng thêm chút dự
phòng. Thiết kế hệ thống cũng bắt đầu bằng những phép tính thô như vậy.

## Thuật ngữ
- **Back-of-the-envelope estimation** (ước lượng nháp): phép tính nhanh, làm tròn, để chọn giữa các
  thiết kế — không phải để tính hóa đơn chính xác.
- **DAU** (daily active users, người dùng hoạt động mỗi ngày).
- **Average rps** (số yêu cầu trung bình mỗi giây) = DAU × số yêu cầu mỗi người mỗi ngày ÷ 86.400
  (số giây trong một ngày).
- **Peak factor** (hệ số cao điểm): đỉnh tải gấp bao nhiêu lần trung bình.
- **Target utilization** (độ bận mục tiêu): mức bận bạn chấp nhận lúc cao điểm, ví dụ 70%, để còn dự
  phòng.

## Hiểu lầm thường gặp
- **M1**: "Chọn máy theo tải trung bình là đủ." Cao điểm làm máy sập.
- **M2**: "Vừa khít đỉnh tải là được." Yêu cầu thật đến theo từng cụm, nên máy vừa khít trên giấy sẽ
  bị đẩy lên 100% ngoài đời, không còn chỗ cho một đợt cao điểm lớn hơn một chút.
- **M3**: "Nhân dư thật nhiều cho an toàn." Tốn tiền; hãy dùng một mức dự phòng có lý do.

## Thí nghiệm
**Đề bài:** một ứng dụng có 20 triệu người dùng mỗi ngày, mỗi người tạo khoảng 50 yêu cầu mỗi ngày.
Cao điểm gấp đôi trung bình. Trên giấy, bạn muốn lúc cao điểm máy bận không quá khoảng 70%. Ngân
sách: $120 mỗi tháng.

**Bước 1: tự tính trước khi chạy.**
- Trung bình: 20.000.000 × 50 ÷ 86.400 ≈ ? *(Khoảng 11.600 rps.)*
- Cao điểm: × 2 ≈ ? *(Khoảng 23.000 rps.)*
- Một vCPU xử lý khoảng 9.000 rps; ở mức 70% là khoảng 6.300 rps. Cần bao nhiêu vCPU? *(23.000 ÷
  6.300 ≈ 3,7, làm tròn lên 4.)*

**Bước 2: chạy thử.** Phòng thí nghiệm gửi tải trung bình, kèm 3 giây cao điểm gấp đôi. Yêu cầu thật
đến dồn cục, nên lúc bận nhất mà phòng thí nghiệm đo được cao hơn con số trên giấy: 4 vCPU trên giấy
bận 64%, khi chạy đo được khoảng 77%.

**Mục tiêu:** p95 không quá 10 ms, độ bận đỉnh đo được không quá 85% (vẫn còn chỗ trống ngay cả lúc
bận nhất), và chi phí không quá $120 mỗi tháng.

| Lựa chọn | vCPU | p95 | Độ bận đỉnh (đo được) | Chi phí | Chuyện gì xảy ra |
|---|---|---|---|---|---|
| A | 4 | khoảng 5 ms | khoảng 77% | $105 | đạt mọi mục tiêu |
| B | 2 | khoảng 460 ms | 100% | $50 | chọn theo trung bình; hơn 7.000 yêu cầu bị từ chối |
| C | 3 | khoảng 5 ms | 100% | $77,5 | vừa khít trên giấy, ngoài đời không còn chỗ trống |
| D | 16 | khoảng 5 ms | khoảng 19% | $435 | vượt xa ngân sách |

## Phản hồi
- **B**: 2 vCPU (khoảng 18.000 rps) chịu được mức trung bình 11.600 nhưng không chịu nổi đỉnh 23.000.
  Trong 3 giây đó hàng đợi đầy và yêu cầu bị từ chối. Luôn tính cho lúc cao điểm, không phải lúc
  trung bình.
- **C**: 3 vCPU (khoảng 27.000 rps) trên giấy đủ cho đỉnh 23.000 ở mức bận 86%. Khi chạy, các cụm yêu
  cầu đến dồn đẩy máy lên 100% trong chốc lát. Hôm nay độ trễ vẫn ổn, nhưng không còn chút dự phòng
  nào: chỉ cần cao điểm lớn hơn dự báo một chút là hàng đợi bắt đầu dài ra.
- **D**: Đạt mọi mục tiêu tốc độ nhưng tốn gần gấp bốn ngân sách và máy rảnh hơn 80% thời gian. Muốn
  dư thêm thì phải nêu được lý do bằng con số.

## Điều cần nhớ
- Trung bình rps = người dùng × yêu cầu mỗi người ÷ 86.400; rồi nhân hệ số cao điểm.
- Số máy = đỉnh tải ÷ (sức một máy × độ bận mục tiêu), làm tròn lên.
- Ước lượng để chọn hướng thiết kế; sai số vài chục phần trăm vẫn ổn.

## Câu hỏi ôn tập
1. 1 triệu người dùng, mỗi người 100 yêu cầu/ngày. Trung bình bao nhiêu rps? *(≈ 1.160 rps.)*
2. Đỉnh 30.000 rps, mỗi máy 10.000 rps, mục tiêu bận 60%. Cần mấy máy? *(30.000 ÷ 6.000 = 5.)*
3. Theo định luật Little, 2.000 rps với độ trễ 50 ms nghĩa là bao nhiêu yêu cầu đồng thời? *(≈ 100.)*
