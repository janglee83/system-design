---
id: l0-availability-nines
title: Tính sẵn sàng và những con số 9
---

## Mục tiêu
Đổi một mục tiêu như "99,9%" thành thời gian ngừng mỗi năm, và tính được tính sẵn sàng của một chuỗi
phụ thuộc cũng như của hai bản dự phòng.

## Hình dung trước
Một quán cà phê hứa "mở cửa 99% thời gian". Nghe như lúc nào cũng mở, nhưng 1% của một năm là hơn
ba ngày rưỡi đóng cửa. Nếu quán cần điện, nước và máy pha cùng chạy một lúc thì cơ hội mở cửa còn
thấp hơn nữa; có hai máy pha thì cơ hội lại cao lên.

## Thuật ngữ
- **Availability** (tính sẵn sàng): phần thời gian (hoặc phần yêu cầu) mà dịch vụ làm đúng việc của
  nó. Tính theo yêu cầu: số yêu cầu thành công ÷ số yêu cầu hợp lệ.
- **"Số chín"**: cách gọi tắt. "Ba số chín" là 99,9%; "năm số chín" là 99,999%.
- **Hard dependency** (phụ thuộc cứng): thành phần mà nó ngừng thì dịch vụ của bạn cũng ngừng.
- **MTBF** (mean time between failures, thời gian trung bình giữa hai lần hỏng) và **MTTR** (mean
  time to recover, thời gian trung bình để khôi phục). Sẵn sàng ≈ MTBF ÷ (MTBF + MTTR).
- **Error budget** (ngân sách lỗi): phần không sẵn sàng được phép, ví dụ 0,1% với mục tiêu 99,9%.

## Hiểu lầm thường gặp
- **M1**: "99% là gần hoàn hảo." Nó cho phép hơn ba ngày rưỡi ngừng mỗi năm.
- **M2**: "Ghép nhiều dịch vụ 99,99% lại thì vẫn là 99,99%." Phụ thuộc nối tiếp làm các tỉ lệ nhân
  với nhau, và kết quả nhỏ đi.
- **M3**: "Thêm một số chín thì chỉ tốn thêm chút ít." Mỗi số chín thêm vào thường đắt hơn số trước
  rất nhiều.

## Bảng cần nhớ

| Mục tiêu | Ngừng tối đa mỗi năm |
|---|---|
| 99% | khoảng 3 ngày 15 giờ |
| 99,9% | khoảng 8 giờ 45 phút |
| 99,95% | khoảng 4 giờ 22 phút |
| 99,99% | khoảng 52 phút |
| 99,999% | khoảng 5 phút |

## Bước 1: quan sát một chuỗi phụ thuộc
Dịch vụ của bạn sẵn sàng 99,99% và cần thêm hai dịch vụ khác, mỗi dịch vụ cũng 99,99%. Trường hợp
tốt nhất: 0,9999 × 0,9999 × 0,9999 ≈ 99,97%.

## Bước 2: phân tích dự phòng
Hai bản độc lập, mỗi bản 99,9%, chỉ cần một bản chạy là đủ: xác suất cả hai cùng ngừng là
0,001 × 0,001 = 0,000001, nên tính sẵn sàng khoảng 99,9999%. Điều kiện then chốt là hai bản phải
**hỏng độc lập**: không chung giá đỡ, không chung nguồn điện, không chung một lỗi phần mềm.

## Bước 3: áp dụng
Một máy trung bình 150 ngày hỏng một lần và mất 1 giờ để khôi phục. Sẵn sàng ≈ 3.600 giờ ÷ (3.600 +
1) ≈ 99,97%. Rút thời gian khôi phục xuống 6 phút thì lên khoảng 99,997%: khôi phục nhanh hơn cũng
đáng giá như hỏng ít đi.

## Câu hỏi
Đạt khi trả lời đúng 4 trên 5 câu.

- **q1**: Mục tiêu 99,9% cho phép ngừng bao nhiêu giờ mỗi năm?
- **q2**: Một dịch vụ có ba phụ thuộc cứng, mỗi cái 99,9%. Trong trường hợp tốt nhất, nó sẵn sàng
  bao nhiêu phần trăm?
- **q3**: Hai bản độc lập, mỗi bản 99%, chỉ cần một bản là đủ. Tính sẵn sàng là bao nhiêu phần trăm?
- **q4**: Vì sao hai máy chủ đặt cùng một giá đỡ không thật sự độc lập?
- **q4.a**: Chúng thường chạy cùng một phiên bản hệ điều hành.
- **q4.b**: Giá đỡ đó mất điện hay mất mạng là cả hai cùng ngừng.
- **q4.c**: Chúng đặt quá gần nhau nên không chia được tải.
- **q5**: Trong 1.000.000 yêu cầu, mục tiêu 99,95% cho phép bao nhiêu yêu cầu thất bại?

## Phản hồi
- **q1**: 0,1% của 8.760 giờ trong một năm là khoảng 8,8 giờ, tròn một ngày làm việc. "Chín mươi chín
  phẩy mấy" lúc nào cũng nghe đẹp hơn thời gian ngừng mà nó cho phép; hãy quy đổi trước khi gật đầu.
- **q2**: Mọi phụ thuộc đều phải chạy thì dịch vụ của bạn mới chạy, nên các xác suất nhân với nhau:
  0,999 × 0,999 × 0,999 ≈ 0,997, tức 99,7%. Ba mắt xích tốt nối lại thành một chuỗi yếu hơn.
- **M3**: Đi từ 99,9% lên 99,99% bớt được khoảng 8 giờ ngừng mỗi năm, nhưng những phút cuối cùng là
  khó nhất: cần các bản dự phòng đặt ở nơi tách biệt, chuyển đổi dự phòng tự động và người trực sự
  cố. Hãy hỏi mỗi số chín thêm vào đáng giá bao nhiêu với người dùng trước khi trả tiền cho nó.

## Điều cần nhớ
- Đổi phần trăm thành thời gian ngừng để thấy con số thật.
- Phụ thuộc nối tiếp nhân lại và kéo tính sẵn sàng xuống; các bản độc lập kéo nó lên.
- Khôi phục nhanh quan trọng ngang với ít hỏng.

## Câu hỏi ôn tập
1. Viết tính sẵn sàng theo MTBF và MTTR.
2. Ngân sách lỗi của mục tiêu 99,99% trong một tháng 30 ngày là bao nhiêu phút? *(Khoảng 4,3 phút.)*
3. Vì sao 100% thường là mục tiêu sai? *(Quá đắt, người dùng không phân biệt được, và mạng cũng như
   thiết bị của chính họ cũng không đạt 100%.)*
