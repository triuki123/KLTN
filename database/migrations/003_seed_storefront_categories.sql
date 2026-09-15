USE bookstore_kltn;

INSERT IGNORE INTO categories (name, slug, description, display_order, status) VALUES
('Văn học', 'van-hoc', 'Tiểu thuyết, truyện ngắn, thơ và các tác phẩm kinh điển.', 1, 'ACTIVE'),
('Kinh tế - Kinh doanh', 'kinh-te-kinh-doanh', 'Quản trị, tài chính, marketing và khởi nghiệp.', 2, 'ACTIVE'),
('Kỹ năng sống', 'ky-nang-song', 'Phát triển bản thân, giao tiếp và thói quen tích cực.', 3, 'ACTIVE'),
('Tâm lý - Giáo dục', 'tam-ly-giao-duc', 'Tâm lý học, nuôi dạy và học tập.', 4, 'ACTIVE'),
('Khoa học - Công nghệ', 'khoa-hoc-cong-nghe', 'Kiến thức khoa học, lập trình và công nghệ.', 5, 'ACTIVE'),
('Thiếu nhi', 'thieu-nhi', 'Sách tranh, truyện và kiến thức dành cho thiếu nhi.', 6, 'ACTIVE');
