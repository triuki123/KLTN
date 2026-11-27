import urllib.request
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

test_cats = {
    "Truyện Tranh - Manga - Comic": 1084,
    "Lịch sử - Địa lý": 873,
    "Sức khỏe - Y học - Thể thao": 876,
    "Học Ngoại Ngữ - Từ Điển": 871,
    "Tôn giáo - Tâm linh - Triết học": 886,
    "Ẩm thực - Nấu ăn - Phong cách sống": 882
}

for name, cat_id in test_cats.items():
    url = f"https://tiki.vn/api/personalish/v1/blocks/listings?category={cat_id}&limit=3"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
    try:
        with urllib.request.urlopen(req, timeout=5) as res:
            data = json.loads(res.read().decode('utf-8'))
            items = data.get('data', [])
            titles = [it.get('name') for it in items[:2]]
            print(f"[{name}] (ID {cat_id}) -> {len(items)} items found. E.g.: {titles}")
    except Exception as e:
        print(f"[{name}] error: {e}")
