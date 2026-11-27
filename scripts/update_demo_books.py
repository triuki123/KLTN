import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from flask_app.app import db

DEMO_MAPPING = {
    'DEMO001': (1, 85000, 68000),    # Nhà giả kim -> Văn học
    'DEMO002': (3, 98000, 78000),    # Đắc nhân tâm -> Kỹ năng sống
    'DEMO003': (4, 150000, 120000),  # Muôn kiếp nhân sinh -> Tâm lý
    'DEMO004': (3, 80000, 64000),    # Tuổi trẻ đáng giá bao nhiêu -> Kỹ năng sống
    'DEMO005': (6, 50000, 40000),    # Dế Mèn phiêu lưu ký -> Thiếu nhi
    'DEMO006': (6, 75000, 60000),    # Cho tôi xin một vé đi tuổi thơ -> Thiếu nhi
    'DEMO007': (1, 110000, 88000),   # Mắt biếc -> Văn học
    'DEMO008': (4, 95000, 76000),    # Đi tìm lẽ sống -> Tâm lý
    'DEMO009': (3, 160000, 128000),  # 7 thói quen hiệu quả -> Kỹ năng sống
    'DEMO010': (4, 210000, 168000),  # Tư duy nhanh và chậm -> Tâm lý
    'DEMO011': (1, 95000, 76000),    # Hoàng tử bé -> Văn học / Thiếu nhi
    'DEMO012': (6, 120000, 96000),   # Totto-chan bên cửa sổ -> Thiếu nhi
    'DEMO013': (6, 135000, 108000),  # Harry Potter -> Thiếu nhi / Văn học
    'DEMO014': (6, 140000, 112000),  # Không gia đình -> Thiếu nhi
    'DEMO015': (1, 105000, 84000),   # 1984 -> Văn học
    'DEMO016': (1, 65000, 52000),    # Animal Farm -> Văn học
    'DEMO017': (1, 80000, 64000),    # Bắt trẻ đồng xanh -> Văn học
    'DEMO018': (1, 145000, 116000),  # Bố già -> Văn học
    'DEMO019': (5, 320000, 256000),  # Clean Code -> Khoa học - Công nghệ
    'DEMO020': (1, 115000, 92000),   # Giết con chim nhại -> Văn học
    'DEMO021': (1, 125000, 100000),  # Kiêu hãnh và định kiến -> Văn học
    'DEMO022': (5, 110000, 88000),   # Lược sử thời gian -> Khoa học - Công nghệ
    'DEMO023': (1, 120000, 96000),   # Người đua diều -> Văn học
    'DEMO024': (1, 195000, 156000),  # Những người khốn khổ -> Văn học
    'DEMO025': (5, 280000, 224000),  # Python Crash Course -> Khoa học - Công nghệ
    'DEMO026': (5, 190000, 152000),  # Sapiens: Lược sử loài người -> Khoa học - Công nghệ
    'DEMO027': (1, 75000, 60000),    # Người vô hình -> Văn học
    'DEMO028': (1, 160000, 128000),  # Trăm năm cô đơn -> Văn học
    'DEMO029': (3, 100000, 80000),   # Quẳng gánh lo đi và vui sống -> Kỹ năng sống
    'DEMO030': (3, 108000, 86000),   # Dám bị ghét -> Kỹ năng sống
    'DEMO031': (3, 115000, 92000),   # Thay đổi tư duy -> Kỹ năng sống
    'DEMO032': (3, 85000, 68000),    # Cà phê cùng Tony -> Kỹ năng sống
    'DEMO033': (3, 125000, 100000),  # Tôi tài giỏi bạn cũng thế -> Kỹ năng sống
    'DEMO034': (2, 180000, 144000),  # Kinh tế học hài hước -> Kinh tế
    'DEMO035': (2, 220000, 176000),  # Chiến lược đại dương xanh -> Kinh tế
    'DEMO036': (2, 195000, 156000),  # Từ tốt đến vĩ đại -> Kinh tế
    'DEMO037': (2, 140000, 112000),  # Cha giàu cha nghèo -> Kinh tế
    'DEMO038': (5, 210000, 168000),  # Vũ trụ trong vỏ hạt dẻ -> Khoa học
    'DEMO039': (5, 250000, 200000),  # Trí tuệ nhân tạo kỷ nguyên mới -> Khoa học
}

def update_demo_books():
    con = db()
    try:
        with con.cursor() as cur:
            for wid, (cid, selling, promo) in DEMO_MAPPING.items():
                cur.execute("""
                    UPDATE external_book_inventory
                    SET category_id = %s, selling_price = %s, promotional_price = %s, cost_price = %s
                    WHERE work_id = %s
                """, (cid, selling, promo, round(selling * 0.65, -3), wid))
        con.commit()
        print("Updated all DEMO books with categories and real diversified prices!")
    finally:
        con.close()

if __name__ == '__main__':
    update_demo_books()

