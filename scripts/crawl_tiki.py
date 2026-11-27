import sys
sys.stdout.reconfigure(encoding='utf-8')
import os
import re
import time
import requests

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from flask_app.app import db

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
}

TIKI_CATEGORY_CONFIG = [
    {
        'category_id': 1,
        'category_name': 'Văn học',
        'tiki_cat_ids': [839],  # Sách văn học
    },
    {
        'category_id': 2,
        'category_name': 'Kinh tế - Kinh doanh',
        'tiki_cat_ids': [846],  # Sách kinh tế
    },
    {
        'category_id': 3,
        'category_name': 'Kỹ năng sống',
        'tiki_cat_ids': [870],  # Sách kỹ năng sống
    },
    {
        'category_id': 4,
        'category_name': 'Tâm lý - Giáo dục',
        'tiki_cat_ids': [868, 2527],  # Sách tâm lý, nuôi dạy con
    },
    {
        'category_id': 5,
        'category_name': 'Khoa học - Công nghệ',
        'tiki_cat_ids': [879],  # Khoa học kỹ thuật, CNTT
    },
    {
        'category_id': 6,
        'category_name': 'Thiếu nhi',
        'tiki_cat_ids': [393],  # Sách thiếu nhi
    },
    {
        'category_id': 7,
        'category_name': 'Truyện Tranh - Manga - Comic',
        'tiki_cat_ids': [1084],  # Manga, Comic, Truyện tranh
    },
    {
        'category_id': 8,
        'category_name': 'Lịch sử - Địa lý',
        'tiki_cat_ids': [873],  # Lịch sử, địa lý
    },
    {
        'category_id': 9,
        'category_name': 'Sức khỏe - Y học - Thể thao',
        'tiki_cat_ids': [876],  # Y học, sức khỏe
    },
    {
        'category_id': 10,
        'category_name': 'Học Ngoại Ngữ - Từ Điển',
        'tiki_cat_ids': [871],  # Sách học ngoại ngữ, từ điển
    },
    {
        'category_id': 11,
        'category_name': 'Triết học - Tôn giáo - Tâm linh',
        'tiki_cat_ids': [886],  # Tôn giáo, tâm linh, triết học
    },
    {
        'category_id': 12,
        'category_name': 'Ẩm thực - Đời sống - Gia đình',
        'tiki_cat_ids': [882],  # Nấu ăn, làm bánh, đời sống
    },
]

def clean_html(raw_html):
    if not raw_html:
        return ""
    clean = re.sub(r'<[^>]+>', ' ', raw_html)
    return re.sub(r'\s+', ' ', clean).strip()

def fetch_product_ids(tiki_cat_id, limit=10):
    url = f"https://tiki.vn/api/personalish/v1/blocks/listings?limit={limit}&category={tiki_cat_id}&page=1"
    try:
        res = requests.get(url, headers=HEADERS, timeout=10)
        if res.status_code == 200:
            data = res.json()
            items = data.get('data', [])
            return [it['id'] for it in items if 'id' in it]
    except Exception as e:
        print(f"Error fetching product ids for tiki category {tiki_cat_id}: {e}")
    return []

def fetch_product_detail(product_id):
    url = f"https://tiki.vn/api/v2/products/{product_id}"
    try:
        res = requests.get(url, headers=HEADERS, timeout=10)
        if res.status_code == 200:
            return res.json()
    except Exception as e:
        print(f"Error fetching product detail for ID {product_id}: {e}")
    return None

def parse_book_data(p, category_id):
    product_id = p.get('id')
    title = p.get('name') or "Chưa rõ tên sách"
    
    # Authors
    authors_list = []
    if p.get('authors'):
        authors_list = [a.get('name', '').strip() for a in p['authors'] if a.get('name')]
    if not authors_list and p.get('brand'):
        brand_name = p['brand'].get('name')
        if brand_name and brand_name.lower() not in ['oem', 'none']:
            authors_list = [brand_name]
    if not authors_list:
        authors_list = ["Nhiều tác giả"]
    authors = ", ".join(authors_list)[:490]

    # Prices: Chỉ lấy giá bìa niêm yết chuẩn, không lấy giá sale/khuyến mãi từ Tiki
    original_price = float(p.get('original_price') or p.get('list_price') or p.get('price') or 99000)
    if original_price <= 0:
        original_price = 99000

    selling_price = original_price
    promotional_price = None  # Không lấy khuyến mãi từ Tiki, Admin Trạm Sách tự thiết lập
    cost_price = round(selling_price * 0.65, -3)

    # Images
    cover_url = ""
    images = p.get('images', [])
    if images and isinstance(images, list):
        cover_url = images[0].get('base_url') or images[0].get('large_url') or ""
    if not cover_url:
        cover_url = p.get('thumbnail_url', "")

    # Specifications
    specs = {}
    specifications = p.get('specifications', [])
    for group in specifications:
        for attr in group.get('attributes', []):
            specs[attr.get('code')] = attr.get('value')

    publisher = specs.get('publisher_vn') or specs.get('manufacturer') or specs.get('Organization_name') or "NXB Tổng Hợp"
    
    # Publication Year
    pub_year_raw = specs.get('publication_date') or specs.get('release_date') or ""
    year_match = re.search(r'\b(19\d{2}|20\d{2})\b', str(pub_year_raw))
    publication_year = int(year_match.group(1)) if year_match else 2024

    # Pages
    page_raw = specs.get('number_of_page') or "250"
    digits = re.findall(r'\d+', str(page_raw))
    page_count = int(digits[0]) if digits else 250

    # ISBN
    isbn = specs.get('isbn') or specs.get('isbn13') or ""
    isbn = re.sub(r'[^0-9X-]', '', str(isbn))[:20]

    # Description
    desc_raw = p.get('description') or p.get('short_description') or ""
    description = clean_html(desc_raw)
    if len(description) < 20:
        description = f"{title} là một trong những tác phẩm nổi bật của {authors}, được bạn đọc đánh giá cao về giá trị nội dung và chất lượng thẩm mỹ."

    sold_count = int(p.get('quantity_sold', {}).get('value') or 0)
    stock_quantity = 20
    minimum_stock = 5

    work_id = f"TK{product_id}"[:30]

    return {
        'work_id': work_id,
        'title': title[:295],
        'authors': authors,
        'cover_url': cover_url[:490],
        'selling_price': selling_price,
        'promotional_price': promotional_price,
        'cost_price': cost_price,
        'stock_quantity': stock_quantity,
        'minimum_stock': minimum_stock,
        'sold_count': sold_count,
        'isbn': isbn,
        'description': description,
        'category_id': category_id,
        'publisher_name': str(publisher)[:250],
        'publication_year': publication_year,
        'page_count': page_count,
        'status': 'ACTIVE',
        'is_featured': 1 if sold_count > 500 else 0
    }

def save_book_to_db(b):
    con = db()
    try:
        with con.cursor() as cur:
            sql = """
                INSERT INTO external_book_inventory(
                    work_id, title, authors, cover_url, selling_price, promotional_price,
                    cost_price, stock_quantity, minimum_stock, sold_count, isbn, description,
                    category_id, publisher_name, publication_year, page_count, status, is_featured
                ) VALUES (
                    %(work_id)s, %(title)s, %(authors)s, %(cover_url)s, %(selling_price)s, %(promotional_price)s,
                    %(cost_price)s, %(stock_quantity)s, %(minimum_stock)s, %(sold_count)s, %(isbn)s, %(description)s,
                    %(category_id)s, %(publisher_name)s, %(publication_year)s, %(page_count)s, %(status)s, %(is_featured)s
                ) ON DUPLICATE KEY UPDATE
                    title = VALUES(title),
                    authors = VALUES(authors),
                    cover_url = VALUES(cover_url),
                    selling_price = VALUES(selling_price),
                    promotional_price = VALUES(promotional_price),
                    cost_price = VALUES(cost_price),
                    sold_count = GREATEST(sold_count, VALUES(sold_count)),
                    isbn = VALUES(isbn),
                    description = VALUES(description),
                    category_id = VALUES(category_id),
                    publisher_name = VALUES(publisher_name),
                    publication_year = VALUES(publication_year),
                    page_count = VALUES(page_count),
                    status = 'ACTIVE'
            """
            cur.execute(sql, b)
        con.commit()
        return True
    except Exception as e:
        print(f"Error saving {b['work_id']} - {b['title']}: {e}")
        con.rollback()
        return False
    finally:
        con.close()

def crawl_tiki_books(limit_per_category=15, category_ids=None):
    total_added = 0
    configs = TIKI_CATEGORY_CONFIG
    if category_ids:
        configs = [c for c in configs if c['category_id'] in category_ids]

    print(f"Bắt đầu cào sách từ Tiki cho {len(configs)} danh mục (Mỗi danh mục {limit_per_category} cuốn)...")

    for cat in configs:
        cat_id = cat['category_id']
        cat_name = cat['category_name']
        print(f"\n---> Danh mục [{cat_id}]: {cat_name}")
        
        product_ids = []
        for tiki_cat in cat['tiki_cat_ids']:
            ids = fetch_product_ids(tiki_cat, limit=limit_per_category)
            product_ids.extend(ids)
            time.sleep(0.5)

        # Unique IDs up to limit
        seen = set()
        unique_ids = [x for x in product_ids if not (x in seen or seen.add(x))][:limit_per_category]

        added_for_cat = 0
        for pid in unique_ids:
            p_data = fetch_product_detail(pid)
            if not p_data:
                continue
            
            b = parse_book_data(p_data, cat_id)
            if save_book_to_db(b):
                added_for_cat += 1
                total_added += 1
                promo_str = f" -> KM: {int(b['promotional_price']):,}đ" if b['promotional_price'] else ""
                print(f"  + [{b['work_id']}] {b['title'][:40]}... | {int(b['selling_price']):,}đ{promo_str}")
            time.sleep(0.6)

        print(f"Hoàn thành danh mục {cat_name}: {added_for_cat} cuốn.")

    print(f"\n==========================================")
    print(f"Tổng kết: Đã lưu {total_added} cuốn sách mới từ Tiki vào cơ sở dữ liệu.")
    return total_added

if __name__ == '__main__':
    limit = int(sys.argv[1]) if len(sys.argv) > 1 else 15
    # If specific category passed
    cats = [int(x) for x in sys.argv[2].split(',')] if len(sys.argv) > 2 else None
    crawl_tiki_books(limit_per_category=limit, category_ids=cats)
