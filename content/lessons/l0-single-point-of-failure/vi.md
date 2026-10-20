---
id: l0-single-point-of-failure
title: "Điểm lỗi đơn: khi một mắt xích đứt"
---

## Mục tiêu
Tìm mọi điểm lỗi đơn trong một hệ thống nhỏ và loại bỏ chúng để hệ thống vẫn phục vụ được hơn 95%
yêu cầu khi một máy web và primary của cơ sở dữ liệu lần lượt hỏng.

## Hình dung trước
Một chiếc xe đạp có hai bánh, mỗi bánh chỉ có một. Thủng bất kỳ bánh nào là xe dừng. Mang theo một
săm dự phòng cho bánh trước mà không có cho bánh sau thì vẫn dừng nếu bánh sau thủng. Và một chiếc
xe đạp "xịn" hơn vẫn có thể thủng săm.

## Thuật ngữ
- **Single point of failure, SPOF** (điểm lỗi đơn): một thành phần mà chỉ riêng nó hỏng cũng đủ làm
  cả hệ thống ngừng.
- **Redundancy** (dự phòng): có hơn một bản của một thành phần, để bản này hỏng thì bản kia làm.
- **Replica** (bản sao): một bản giống hệt. Với máy chủ web, đó là một máy nữa chạy cùng chương
  trình. Với cơ sở dữ liệu, **read replica** (bản sao chỉ đọc) là một máy cơ sở dữ liệu nhận bản sao
  dữ liệu từ **primary** (bản chính, nơi nhận ghi).
- **Failover** (chuyển đổi dự phòng): khi primary hỏng, một bản sao được **promote** (nâng cấp) lên
  làm primary. Việc này mất một chút thời gian (ở đây khoảng 0,6 giây), trong lúc đó các thao tác
  ghi thất bại.
- **spofCount**: số thành phần chỉ có đúng một bản trong lần chạy.

## Hiểu lầm thường gặp
- **M1**: "Một máy thật mạnh thì không hỏng." Kích thước không chống được hỏng hóc.
- **M2**: "Thêm dự phòng ở một chỗ là cả hệ thống đã dự phòng." Chỉ cần còn một điểm lỗi đơn, nó vẫn
  kéo cả hệ thống xuống.
- **M3**: "Có bản sao lưu (backup) là đủ sẵn sàng." Backup giữ dữ liệu, không giữ dịch vụ chạy trong
  lúc khôi phục.

## Thí nghiệm
**Bối cảnh:** Người dùng → web → PostgreSQL, 2.000 yêu cầu/giây. Ở giây thứ 3, một máy web chết. Ở
giây thứ 6, primary của cơ sở dữ liệu chết. Bạn chỉnh: số bản máy web (1, 2), vCPU mỗi máy web (2, 8),
số bản sao cơ sở dữ liệu (0, 1). Tạm thời coi như có "ai đó" chia yêu cầu giữa hai máy web; bài L1
sẽ cho bạn thấy đó là bộ cân bằng tải.

**Dự đoán trước khi chạy:** nếu chỉ thêm bản sao cho máy web, tỉ lệ sẵn sàng sẽ khoảng bao nhiêu? *(Khoảng 60%: cơ sở dữ liệu vẫn chết lúc 6 s mà không có gì thay.)*

**Mục tiêu:** `availability ≥ 95%` và `spofCount = 0`.

| Lựa chọn | Máy web | vCPU | Bản sao CSDL | Sẵn sàng | spofCount |
|---|---|---|---|---|---|
| A | 2 | 2 | 1 | khoảng 98,8% | 0 |
| B | 1 | 8 | 0 | khoảng 30% | 2 |
| C | 2 | 2 | 0 | khoảng 60% | 1 |
| D | 1 | 2 | 1 | khoảng 30% | 1 |

Ở lựa chọn A, mở tab **Events**: `instance.down` lúc 3 s, `db.primary-down` lúc 6 s, `db.promoted`
lúc 6,6 s. Khoảng 1,2% yêu cầu thất bại nằm gọn trong 0,6 giây chờ nâng cấp.

## Phản hồi
- **B**: 8 vCPU không ngăn máy chết. Khi máy web duy nhất tắt lúc 3 s, không còn ai trả lời; 70% thời
  gian còn lại là mất trắng. Và cơ sở dữ liệu vẫn chỉ có một bản.
- **C**: Tầng web đã an toàn: mất một máy, máy kia gánh tiếp. Nhưng lúc 6 s cơ sở dữ liệu duy nhất
  chết và không có bản nào thay (`db.no-replica`). Điểm lỗi đơn cuối cùng vẫn đánh sập hệ thống.
- **D**: Lần này cơ sở dữ liệu có bản sao, nhưng máy web duy nhất chết lúc 3 s nên chẳng yêu cầu nào
  tới được cơ sở dữ liệu nữa. Phải dự phòng ở **mọi** mắt xích.
- **M3**: Backup là bản lưu dữ liệu, không phải một máy thứ hai đang chạy. Khôi phục từ backup mất
  vài phút đến vài giờ, và suốt thời gian đó dịch vụ ngừng. Trong thí nghiệm này không có nút nào là
  backup, vì chỉ có backup thì kết quả lần chạy cũng không khác đi.

## Điều cần nhớ
- Hệ thống chỉ khỏe bằng mắt xích yếu nhất không có dự phòng.
- Dự phòng cần hai thứ: bản thứ hai và cách chuyển sang nó.
- Chuyển đổi dự phòng không tức thời; luôn có một khoảng ngắn bị lỗi.

## Câu hỏi ôn tập
1. Định nghĩa điểm lỗi đơn bằng lời của bạn.
2. Vì sao trong lựa chọn C tỉ lệ sẵn sàng là khoảng 60%? *(Cơ sở dữ liệu chết lúc 6 s, không có bản
   thay, nên 4 giây cuối mất trắng.)*
3. Trong lúc chờ promote bản sao, loại yêu cầu nào thất bại? *(Các yêu cầu ghi.)*
4. Một hệ thống có LB, 3 máy web và 1 cơ sở dữ liệu không bản sao. spofCount ít nhất là bao nhiêu?
   *(Ít nhất 2 nếu LB chỉ có một bản: LB và cơ sở dữ liệu.)*
