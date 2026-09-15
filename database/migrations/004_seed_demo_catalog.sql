USE bookstore_kltn;

-- Development catalogue: real application records stored in MySQL.
-- They may be edited, restocked, or removed from the admin inventory module.
INSERT IGNORE INTO external_book_inventory (work_id,title,authors,cover_url,stock_quantity,minimum_stock,sold_count) VALUES
('DEMO001','Nhà giả kim','Paulo Coelho','https://covers.openlibrary.org/b/isbn/9780061122415-L.jpg',18,5,9),
('DEMO002','Đắc nhân tâm','Dale Carnegie','https://covers.openlibrary.org/b/isbn/9780671027032-L.jpg',24,5,12),
('DEMO003','Muôn kiếp nhân sinh','Nguyên Phong','https://covers.openlibrary.org/b/isbn/9786043381627-L.jpg',16,5,8),
('DEMO004','Tuổi trẻ đáng giá bao nhiêu','Rosie Nguyễn','https://covers.openlibrary.org/b/isbn/9786048044565-L.jpg',21,5,6),
('DEMO005','Dế Mèn phiêu lưu ký','Tô Hoài','https://covers.openlibrary.org/b/isbn/9786043376913-L.jpg',30,6,14),
('DEMO006','Cho tôi xin một vé đi tuổi thơ','Nguyễn Nhật Ánh','https://covers.openlibrary.org/b/isbn/9786042092043-L.jpg',26,5,11),
('DEMO007','Mắt biếc','Nguyễn Nhật Ánh','https://covers.openlibrary.org/b/isbn/9786042094689-L.jpg',19,5,10),
('DEMO008','Đi tìm lẽ sống','Viktor E. Frankl','https://covers.openlibrary.org/b/isbn/9780807014295-L.jpg',15,4,7),
('DEMO009','7 thói quen hiệu quả','Stephen R. Covey','https://covers.openlibrary.org/b/isbn/9781982137274-L.jpg',17,4,8),
('DEMO010','Tư duy nhanh và chậm','Daniel Kahneman','https://covers.openlibrary.org/b/isbn/9780374533557-L.jpg',12,4,5),
('DEMO011','Sapiens: Lược sử loài người','Yuval Noah Harari','https://covers.openlibrary.org/b/isbn/9780062316097-L.jpg',20,5,13),
('DEMO012','Lược sử thời gian','Stephen Hawking','https://covers.openlibrary.org/b/isbn/9780553380163-L.jpg',14,4,6),
('DEMO013','Clean Code','Robert C. Martin','https://covers.openlibrary.org/b/isbn/9780132350884-L.jpg',16,4,9),
('DEMO014','Python Crash Course','Eric Matthes','https://covers.openlibrary.org/b/isbn/9781718502703-L.jpg',13,4,5),
('DEMO015','Bắt trẻ đồng xanh','J. D. Salinger','https://covers.openlibrary.org/b/isbn/9780316769488-L.jpg',11,3,4),
('DEMO016','1984','George Orwell','https://covers.openlibrary.org/b/isbn/9780451524935-L.jpg',23,5,15),
('DEMO017','Kiêu hãnh và định kiến','Jane Austen','https://covers.openlibrary.org/b/isbn/9780141439518-L.jpg',18,4,9),
('DEMO018','Giết con chim nhại','Harper Lee','https://covers.openlibrary.org/b/isbn/9780061120084-L.jpg',14,4,7),
('DEMO019','Hoàng tử bé','Antoine de Saint-Exupéry','https://covers.openlibrary.org/b/isbn/9780156012195-L.jpg',28,6,16),
('DEMO020','Người đua diều','Khaled Hosseini','https://covers.openlibrary.org/b/isbn/9781594631931-L.jpg',12,3,5),
('DEMO021','Bố già','Mario Puzo','https://covers.openlibrary.org/b/isbn/9780451205766-L.jpg',16,4,8),
('DEMO022','Harry Potter và hòn đá phù thủy','J. K. Rowling','https://covers.openlibrary.org/b/isbn/9780590353427-L.jpg',25,5,17),
('DEMO023','Những người khốn khổ','Victor Hugo','https://covers.openlibrary.org/b/isbn/9780451419439-L.jpg',10,3,3),
('DEMO024','Trăm năm cô đơn','Gabriel García Márquez','https://covers.openlibrary.org/b/isbn/9780060883287-L.jpg',12,3,6),
('DEMO025','Không gia đình','Hector Malot','https://covers.openlibrary.org/b/isbn/9780140440400-L.jpg',17,4,8),
('DEMO026','Totto-chan bên cửa sổ','Kuroyanagi Tetsuko','https://covers.openlibrary.org/b/isbn/9784770020677-L.jpg',20,5,10),
('DEMO027','Quẳng gánh lo đi và vui sống','Dale Carnegie','https://covers.openlibrary.org/b/isbn/9780671027032-L.jpg',22,5,12),
('DEMO028','Dám bị ghét','Kishimi Ichiro, Koga Fumitake','https://covers.openlibrary.org/b/isbn/9781501197277-L.jpg',15,4,7),
('DEMO029','Tôi tài giỏi, bạn cũng thế','Adam Khoo','https://covers.openlibrary.org/b/isbn/9789810733796-L.jpg',18,4,9),
('DEMO030','Cà phê cùng Tony','Tony Buổi Sáng','https://covers.openlibrary.org/b/isbn/9786047733309-L.jpg',20,5,11);

-- Fill covers for an existing local demo catalogue without replacing uploads.
UPDATE external_book_inventory
SET cover_url = CASE work_id
  WHEN 'DEMO001' THEN 'https://covers.openlibrary.org/b/isbn/9780061122415-L.jpg'
  WHEN 'DEMO002' THEN 'https://covers.openlibrary.org/b/isbn/9780671027032-L.jpg'
  WHEN 'DEMO003' THEN 'https://covers.openlibrary.org/b/isbn/9786043381627-L.jpg'
  WHEN 'DEMO004' THEN 'https://covers.openlibrary.org/b/isbn/9786048044565-L.jpg'
  WHEN 'DEMO005' THEN 'https://covers.openlibrary.org/b/isbn/9786043376913-L.jpg'
  WHEN 'DEMO006' THEN 'https://covers.openlibrary.org/b/isbn/9786042092043-L.jpg'
  WHEN 'DEMO007' THEN 'https://covers.openlibrary.org/b/isbn/9786042094689-L.jpg'
  WHEN 'DEMO008' THEN 'https://covers.openlibrary.org/b/isbn/9780807014295-L.jpg'
  WHEN 'DEMO009' THEN 'https://covers.openlibrary.org/b/isbn/9781982137274-L.jpg'
  WHEN 'DEMO010' THEN 'https://covers.openlibrary.org/b/isbn/9780374533557-L.jpg'
  WHEN 'DEMO011' THEN 'https://covers.openlibrary.org/b/isbn/9780062316097-L.jpg'
  WHEN 'DEMO012' THEN 'https://covers.openlibrary.org/b/isbn/9780553380163-L.jpg'
  WHEN 'DEMO013' THEN 'https://covers.openlibrary.org/b/isbn/9780132350884-L.jpg'
  WHEN 'DEMO014' THEN 'https://covers.openlibrary.org/b/isbn/9781718502703-L.jpg'
  WHEN 'DEMO015' THEN 'https://covers.openlibrary.org/b/isbn/9780316769488-L.jpg'
  WHEN 'DEMO016' THEN 'https://covers.openlibrary.org/b/isbn/9780451524935-L.jpg'
  WHEN 'DEMO017' THEN 'https://covers.openlibrary.org/b/isbn/9780141439518-L.jpg'
  WHEN 'DEMO018' THEN 'https://covers.openlibrary.org/b/isbn/9780061120084-L.jpg'
  WHEN 'DEMO019' THEN 'https://covers.openlibrary.org/b/isbn/9780156012195-L.jpg'
  WHEN 'DEMO020' THEN 'https://covers.openlibrary.org/b/isbn/9781594631931-L.jpg'
  WHEN 'DEMO021' THEN 'https://covers.openlibrary.org/b/isbn/9780451205766-L.jpg'
  WHEN 'DEMO022' THEN 'https://covers.openlibrary.org/b/isbn/9780590353427-L.jpg'
  WHEN 'DEMO023' THEN 'https://covers.openlibrary.org/b/isbn/9780451419439-L.jpg'
  WHEN 'DEMO024' THEN 'https://covers.openlibrary.org/b/isbn/9780060883287-L.jpg'
  WHEN 'DEMO025' THEN 'https://covers.openlibrary.org/b/isbn/9780140440400-L.jpg'
  WHEN 'DEMO026' THEN 'https://covers.openlibrary.org/b/isbn/9784770020677-L.jpg'
  WHEN 'DEMO027' THEN 'https://covers.openlibrary.org/b/isbn/9780671027032-L.jpg'
  WHEN 'DEMO028' THEN 'https://covers.openlibrary.org/b/isbn/9781501197277-L.jpg'
  WHEN 'DEMO029' THEN 'https://covers.openlibrary.org/b/isbn/9789810733796-L.jpg'
  WHEN 'DEMO030' THEN 'https://covers.openlibrary.org/b/isbn/9786047733309-L.jpg'
END
WHERE work_id BETWEEN 'DEMO001' AND 'DEMO030'
  AND (cover_url IS NULL OR cover_url = '');
