# TikTok Share Filter cho iPhone

Tool dạng PWA: mở bằng Safari và thêm vào màn hình chính, sử dụng gần giống một ứng dụng iPhone.

## Chức năng

- Tìm video TikTok theo một hoặc nhiều từ khóa.
- Lấy lượt share, view, like, bình luận, tài khoản, mô tả và link video.
- Lọc share tối thiểu/tối đa, view, like, bình luận.
- Mặc định sắp xếp share từ ít đến nhiều.
- Loại video trùng và bài trình chiếu ảnh.
- Xuất Excel `.xlsx`, CSV hoặc sao chép toàn bộ link.
- Lưu cấu hình trên thiết bị.
- Có nút dừng, đồng thời gửi lệnh dừng Actor để hạn chế tốn lượt API.

## Bước 1 — Lấy Apify API Token

1. Tạo tài khoản Apify.
2. Vào **Settings / Integrations**.
3. Sao chép API Token có dạng `apify_api_...`.
4. Không chia sẻ token công khai.

Actor mặc định: `clockworks~tiktok-scraper`.

## Bước 2 — Đưa tool lên Netlify

Bản này có Netlify Function để iPhone gọi API ổn định và tránh lỗi CORS. Nên triển khai bằng Netlify thay vì chỉ mở file HTML.

### Cách dễ nhất bằng GitHub + Netlify

1. Giải nén thư mục này.
2. Tạo một repository GitHub mới và tải toàn bộ file/thư mục lên, bao gồm `netlify/functions`.
3. Đăng nhập Netlify → **Add new site** → **Import an existing project**.
4. Chọn repository vừa tạo.
5. Build command: để trống.
6. Publish directory: `.`
7. Nhấn Deploy.
8. Netlify tạo một địa chỉ HTTPS cho tool.

Lưu ý: Netlify Drop kéo-thả thủ công có thể không triển khai Functions. Vì vậy nên kết nối repository GitHub.

## Bước 3 — Cài lên màn hình iPhone

1. Mở địa chỉ Netlify bằng **Safari**.
2. Nhấn nút **Chia sẻ**.
3. Chọn **Thêm vào MH chính**.
4. Mở biểu tượng `TikShare` trên màn hình chính.

## Bước 4 — Sử dụng

1. Nhấn biểu tượng bánh răng.
2. Dán Apify API Token và nhấn **Lưu cấu hình**.
3. Nhập mỗi từ khóa trên một dòng.
4. Chọn số video mỗi từ khóa.
5. Đặt share tối thiểu/tối đa nếu cần.
6. Giữ lựa chọn **Share ít → nhiều**.
7. Nhấn **Tìm và lọc video**.
8. Nhấn dấu `•••` để xuất Excel, CSV hoặc sao chép link.

## Xử lý lỗi

- Báo `404` ở `/.netlify/functions/run-tiktok`: site chưa triển khai Functions; kiểm tra thư mục `netlify/functions` và kết nối lại GitHub với Netlify.
- Báo token không hợp lệ: tạo hoặc sao chép lại token trong Apify.
- Không có kết quả: giảm các ngưỡng share/view/like, tăng số video mỗi từ khóa hoặc đổi cách tìm ban đầu sang “Liên quan nhất”.
- Actor bị lỗi: mở phần Cài đặt và kiểm tra Actor ID.

## Lưu ý

- Đây là công cụ tìm và phân tích video công khai, không tự đăng nhập TikTok.
- Lượt share có thể thay đổi theo thời gian.
- API bên thứ ba có thể tính phí theo số kết quả và có thể thay đổi cấu trúc dữ liệu.
- Mức 20–100 video/từ khóa thường dễ quản lý hơn trên iPhone.


## Bản 1.1 – sửa lỗi HTTP 404 trên iPhone

Bản này tự động thử hai cách kết nối:

1. Netlify Function nếu site được triển khai từ GitHub và Function đã được nhận diện.
2. Apify API trực tiếp nếu Netlify Function trả 404 hoặc không tồn tại.

Vì vậy, site triển khai bằng Netlify Drag & Drop vẫn có thể chạy. Sau khi cập nhật file, hãy mở lại bằng Safari. Nếu biểu tượng cũ vẫn dùng cache, xóa biểu tượng TikShare khỏi màn hình chính rồi thêm lại.

### Kiểm tra Netlify Function

Mở đường dẫn sau, thay tên site của bạn:

`https://TEN-SITE.netlify.app/.netlify/functions/run-tiktok`

- Hiện JSON báo chỉ hỗ trợ POST/HTTP 405: Function đã được triển khai.
- Hiện trang 404: Function chưa được triển khai; bản 1.1 sẽ tự gọi Apify trực tiếp.
