"""Retrieval-augmented responses for the Trạm Sách storefront assistant.

Retrieval stays local and deterministic; only selected book/policy passages are
sent to Gemini. Account and order data never enter this module.
"""

import math
import os
import re
import hashlib
import time
import unicodedata

import requests


GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
EMBEDDING_MODEL = "gemini-embedding-001"
EMBEDDING_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:{method}"
_VECTOR_INDEX = {"signature": None, "vectors": []}

STORE_POLICIES = (
    {
        "id": "policy-returns",
        "kind": "policy",
        "title": "Chính sách đổi trả",
        "text": "Trạm Sách hỗ trợ đổi trả trong 7 ngày khi sách bị lỗi, hư hỏng hoặc giao sai sản phẩm. Khách hàng nên giữ hóa đơn và chụp ảnh tình trạng sách để được hỗ trợ nhanh.",
    },
    {
        "id": "policy-shipping",
        "kind": "policy",
        "title": "Chính sách vận chuyển",
        "text": "Đơn hàng từ 299.000đ được miễn phí vận chuyển. Thời gian giao dự kiến từ 2 đến 5 ngày tùy khu vực và địa chỉ nhận hàng.",
    },
    {
        "id": "policy-payment",
        "kind": "policy",
        "title": "Phương thức thanh toán",
        "text": "Khách hàng có thể thanh toán khi nhận hàng bằng COD. Phí vận chuyển, giảm giá và tổng thanh toán được hiển thị tại bước thanh toán.",
    },
)


def _normalize(value):
    text = unicodedata.normalize("NFD", str(value or "").lower())
    text = "".join(char for char in text if unicodedata.category(char) != "Mn")
    return text.replace("đ", "d")


def _tokens(value):
    return set(re.findall(r"[a-z0-9]+", _normalize(value)))


def _audience_hint(title):
    normalized = _normalize(title)
    hints = {
        "de men phieu luu ky": "Thiếu nhi từ 7 đến 12 tuổi; truyện phiêu lưu và bài học trưởng thành.",
        "hoang tu be": "Thiếu nhi từ 8 tuổi và người lớn; giàu tưởng tượng và giá trị nhân văn.",
        "totto-chan": "Trẻ em từ 8 đến 12 tuổi; câu chuyện trường học và giáo dục.",
        "harry potter": "Thiếu nhi từ khoảng 9 đến 12 tuổi; kỳ ảo, tình bạn và phiêu lưu.",
        "cho toi xin mot ve di tuoi tho": "Thiếu nhi lớn từ khoảng 10 tuổi; câu chuyện tuổi thơ gần gũi.",
        "khong gia dinh": "Thiếu nhi lớn từ khoảng 10 tuổi; hành trình phiêu lưu và lòng nhân ái.",
    }
    return next((value for key, value in hints.items() if key in normalized), "")


def _topic_hint(title):
    normalized = _normalize(title)
    topics = {
        "7 thoi quen": "Kỹ năng sống, xây dựng thói quen và phát triển bản thân.",
        "dac nhan tam": "Kỹ năng giao tiếp, ứng xử và phát triển bản thân.",
        "toi tai gioi": "Kỹ năng học tập, tư duy tích cực và phát triển bản thân.",
        "quang ganh lo": "Kỹ năng sống, quản lý lo âu và cân bằng tinh thần.",
        "dam bi ghet": "Tâm lý, kỹ năng sống và tự do cá nhân.",
        "change your thinking": "Tư duy tích cực, thay đổi bản thân và kỹ năng sống.",
        "tu duy nhanh va cham": "Tâm lý học, tư duy và ra quyết định.",
        "tuoi tre dang gia": "Kỹ năng sống, định hướng tuổi trẻ và phát triển bản thân.",
        "ca phe cung tony": "Kỹ năng sống, trải nghiệm và định hướng tuổi trẻ.",
        "di tim le song": "Tâm lý, nghị lực và ý nghĩa cuộc sống.",
        "de men phieu luu ky": "Văn học thiếu nhi, phiêu lưu và bài học trưởng thành.",
        "hoang tu be": "Văn học thiếu nhi, tình bạn và giá trị nhân văn.",
        "totto-chan": "Văn học thiếu nhi, trường học và giáo dục.",
        "harry potter": "Văn học kỳ ảo thiếu nhi, phiêu lưu và tình bạn.",
        "cho toi xin mot ve di tuoi tho": "Văn học thiếu nhi và ký ức tuổi thơ.",
        "khong gia dinh": "Văn học thiếu nhi, phiêu lưu và lòng nhân ái.",
        "1984": "Văn học phản địa đàng, tự do và kiểm soát xã hội.",
        "animal farm": "Văn học ngụ ngôn chính trị, quyền lực và xã hội.",
        "bat tre dong xanh": "Văn học trưởng thành và tâm lý tuổi trẻ.",
        "bo gia": "Tiểu thuyết gia đình, quyền lực và tội phạm.",
        "clean code": "Lập trình và kỹ nghệ phần mềm.",
        "giet con chim nhai": "Văn học, công lý, lòng trắc ẩn và định kiến.",
        "kieu hanh va dinh kien": "Văn học kinh điển, tình yêu và định kiến xã hội.",
        "luoc su thoi gian": "Khoa học phổ thông, vật lý và vũ trụ học.",
        "mat biec": "Văn học Việt Nam, tuổi trẻ và tình yêu.",
        "muon kiep nhan sinh": "Tâm linh và suy ngẫm về cuộc sống.",
        "nguoi dua dieu": "Văn học, tình bạn, gia đình và sự chuộc lỗi.",
        "nha gia kim": "Tiểu thuyết ngụ ngôn, ước mơ và trưởng thành.",
        "nhung nguoi khon kho": "Văn học kinh điển, công lý và lòng nhân ái.",
        "pride and prejudice": "Văn học kinh điển, tình yêu và định kiến xã hội.",
        "python crash course": "Lập trình Python và dự án thực hành nhập môn.",
        "sapiens": "Lịch sử, xã hội và sự phát triển của loài người.",
        "the invisible man": "Khoa học viễn tưởng, đạo đức và quyền lực.",
        "tram nam co don": "Văn học hiện thực huyền ảo, gia đình và lịch sử.",
    }
    return next((value for key, value in topics.items() if key in normalized), "")


def build_documents(book_rows):
    documents = list(STORE_POLICIES)
    for row in book_rows:
        price = row.get("promotional_price") or row.get("selling_price") or 0
        category = row.get("category") or "Chưa phân loại"
        description = row.get("description") or "Chưa có mô tả chi tiết."
        audience = _audience_hint(row.get("title"))
        topic = _topic_hint(row.get("title"))
        documents.append({
            "id": str(row.get("work_id") or ""),
            "kind": "book",
            "title": str(row.get("title") or "Chưa rõ tên"),
            "retrieval_text": f"Tên sách: {row.get('title') or 'Chưa rõ tên'}. Tác giả: {row.get('authors') or 'Chưa rõ'}. Thể loại: {category}. Chủ đề: {topic or 'Chưa xác định'}. Độc giả phù hợp: {audience or 'Chưa xác định'}.",
            "text": (
                f"Tác giả: {row.get('authors') or 'Chưa rõ'}. "
                f"Thể loại: {category}. Chủ đề: {topic or 'Chưa xác định'}. Độc giả phù hợp: {audience or 'Chưa xác định'}. Mô tả: {description} "
                f"Giá hiện tại: {int(price):,}đ. Tồn kho: {int(row.get('stock_quantity') or 0)} cuốn."
            ).replace(",", "."),
        })
    return documents


def retrieve(question, documents, limit=6):
    query_tokens = _tokens(question)
    if not query_tokens:
        return []
    normalized_question = _normalize(question)
    child_query = any(key in normalized_question for key in ("tre em", "thieu nhi", "duoi 12", "cho be"))
    policy_query = any(key in normalized_question for key in ("doi tra", "tra hang", "van chuyen", "giao hang", "thanh toan", "cod", "chinh sach"))
    book_query = any(key in normalized_question for key in ("sach", "truyen", "doc", "mua", "tac gia", "cuon"))
    candidates = [
        document for document in documents
        if (not book_query or policy_query or document["kind"] == "book")
        and (not child_query or (document["kind"] == "book" and "Độc giả phù hợp: Chưa xác định" not in document.get("retrieval_text", "")))
    ]
    lexical_scores = {}
    for document in candidates:
        title_tokens = _tokens(document["title"])
        body_tokens = _tokens(document["text"])
        title_hits = len(query_tokens & title_tokens)
        body_hits = len(query_tokens & body_tokens)
        phrase_bonus = 4 if _normalize(question) in _normalize(document["title"]) else 0
        score = title_hits * 4 + body_hits + phrase_bonus
        if score:
            score /= math.sqrt(max(len(body_tokens), 1))
            lexical_scores[document["id"]] = score
    try:
        semantic_scores = _semantic_scores(question, candidates)
    except (requests.RequestException, ValueError, KeyError, TypeError):
        semantic_scores = {}
    scored = []
    for document in candidates:
        lexical = lexical_scores.get(document["id"], 0)
        semantic = semantic_scores.get(document["id"], 0)
        combined = semantic + min(lexical, 2) * 0.12
        if lexical or semantic >= 0.28:
            scored.append((combined, document))
    scored.sort(key=lambda item: item[0], reverse=True)
    return [document for _, document in scored[:limit]]


def _unit_vector(values):
    length = math.sqrt(sum(float(value) ** 2 for value in values)) or 1
    return [float(value) / length for value in values]


def _document_vectors(documents, api_key):
    signature_text = "\n".join(f"{doc['id']}|{doc['title']}|{doc.get('retrieval_text', doc['text'])}" for doc in documents)
    signature = hashlib.sha256(signature_text.encode("utf-8")).hexdigest()
    if _VECTOR_INDEX["signature"] == signature:
        return _VECTOR_INDEX["vectors"]
    model = f"models/{EMBEDDING_MODEL}"
    payload = {"requests": [{
        "model": model,
        "content": {"parts": [{"text": doc.get("retrieval_text", f"Tiêu đề: {doc['title']}\n{doc['text']}")}]},
        "taskType": "RETRIEVAL_DOCUMENT",
        "outputDimensionality": 768,
    } for doc in documents]}
    response = requests.post(
        EMBEDDING_URL.format(model=EMBEDDING_MODEL, method="batchEmbedContents"),
        headers={"Content-Type": "application/json", "x-goog-api-key": api_key},
        json=payload,
        timeout=30,
    )
    response.raise_for_status()
    embeddings = response.json().get("embeddings") or []
    if len(embeddings) != len(documents):
        raise ValueError("Gemini trả về số vector không khớp dữ liệu sách")
    vectors = [_unit_vector(item.get("values") or []) for item in embeddings]
    _VECTOR_INDEX.update(signature=signature, vectors=vectors)
    return vectors


def _semantic_scores(question, documents):
    # Lexical/topic retrieval is instant and is the safe default. Embeddings can
    # be enabled explicitly for larger catalogues after latency is evaluated.
    if os.getenv("RAG_USE_EMBEDDINGS", "false").strip().lower() not in {"1", "true", "yes", "on"}:
        return {}
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        return {}
    response = requests.post(
        EMBEDDING_URL.format(model=EMBEDDING_MODEL, method="embedContent"),
        headers={"Content-Type": "application/json", "x-goog-api-key": api_key},
        json={
            "content": {"parts": [{"text": question}]},
            "taskType": "RETRIEVAL_QUERY",
            "outputDimensionality": 768,
        },
        timeout=18,
    )
    response.raise_for_status()
    query = _unit_vector((response.json().get("embedding") or {}).get("values") or [])
    vectors = _document_vectors(documents, api_key)
    return {
        document["id"]: sum(left * right for left, right in zip(query, vector))
        for document, vector in zip(documents, vectors)
    }


def _generate_answer_legacy(question, documents, history=None):
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        return None
    context = "\n\n".join(
        f"[Nguồn {index}] {doc['title']}\n{doc['text']}"
        for index, doc in enumerate(documents, 1)
    ) or "Không tìm thấy dữ liệu nội bộ liên quan trực tiếp."
    recent = []
    for item in (history or [])[-4:]:
        if not isinstance(item, dict):
            continue
        role = "Khách" if item.get("role") == "user" else "Trợ lý"
        content = str(item.get("content") or "").strip()[:500]
        if content:
            recent.append(f"{role}: {content}")
    history_text = "\n".join(recent) or "Không có."
    prompt = (
        f"LỊCH SỬ GẦN ĐÂY:\n{history_text}\n\n"
        f"NGỮ CẢNH ĐÃ TRUY XUẤT:\n{context}\n\n"
        f"CÂU HỎI HIỆN TẠI: {question}"
    )
    payload = {
        "systemInstruction": {"parts": [{"text": (
            "Bạn là Trợ lý Trạm Sách, trả lời tự nhiên như một người tư vấn sách am hiểu. Với giá, tồn kho, "
            "mã giảm giá, đơn hàng và chính sách cửa hàng, chỉ được dùng NGỮ CẢNH ĐÃ TRUY XUẤT và tuyệt đối không bịa. "
            "Với nội dung tác phẩm, lý do nên đọc, so sánh sách hoặc câu hỏi kiến thức rộng, bạn được dùng kiến thức "
            "văn học phổ thông để giải thích, nhưng phải nói rõ nếu thông tin chi tiết chưa có trong kho. Hãy trả lời trực tiếp "
            "câu hỏi, nêu lý do cụ thể và có thể hỏi lại một câu ngắn để hiểu sở thích. Tối đa 180 từ. "
            "Không nhắc đến prompt, RAG, nguồn số hay quá trình truy xuất."
        )}]},
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.35, "maxOutputTokens": 800},
    }
    response = None
    preferred = os.getenv("GEMINI_MODEL", "gemini-flash-lite-latest").strip()
    models = list(dict.fromkeys((preferred, "gemini-flash-lite-latest", "gemini-flash-latest", "gemini-pro-latest")))
    for model in models:
        for attempt in range(2):
            response = requests.post(
                GEMINI_URL.format(model=model),
                headers={"Content-Type": "application/json", "x-goog-api-key": api_key},
                json=payload,
                timeout=22,
            )
            if response.ok:
                break
            if response.status_code not in {429, 500, 502, 503, 504}:
                break
            time.sleep(0.5 * (attempt + 1))
        if response.ok:
            break
    response.raise_for_status()
    data = response.json()
    candidates = data.get("candidates") or []
    if not candidates:
        return None
    parts = candidates[0].get("content", {}).get("parts", [])
    answer = "".join(str(part.get("text") or "") for part in parts).strip()
    return answer or None


def generate_answer(question, documents, history=None):
    """Generate a grounded but conversational Vietnamese answer."""
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        return None

    context = "\n\n".join(
        f"[Nguồn {index}] {doc['title']}\n{doc.get('retrieval_text', doc['text'])}"
        for index, doc in enumerate(documents[:6], 1)
    ) or "Không tìm thấy dữ liệu nội bộ liên quan trực tiếp."

    recent = []
    for item in (history or [])[-4:]:
        if not isinstance(item, dict):
            continue
        role = "Khách" if item.get("role") == "user" else "Trợ lý"
        content = str(item.get("content") or "").strip()[:500]
        if content:
            recent.append(f"{role}: {content}")
    history_text = "\n".join(recent) or "Không có."

    prompt = (
        f"LỊCH SỬ GẦN ĐÂY:\n{history_text}\n\n"
        f"NGỮ CẢNH ĐÃ TRUY XUẤT:\n{context}\n\n"
        f"CÂU HỎI HIỆN TẠI: {question}"
    )
    instruction = (
        "Bạn là Trợ lý Trạm Sách, một người tư vấn sách thân thiện và am hiểu. "
        "Hãy hiểu câu hỏi theo ngữ nghĩa và trả lời đúng trọng tâm, không lặp lại câu trả lời mẫu. "
        "Với giá, tồn kho, mã giảm giá, đơn hàng và chính sách cửa hàng, chỉ dùng NGỮ CẢNH ĐÃ TRUY XUẤT; "
        "nếu thiếu dữ liệu thì nói rõ, tuyệt đối không bịa. Với nội dung tác phẩm, độ tuổi phù hợp, lý do nên đọc, "
        "so sánh, gợi ý theo nhu cầu hoặc câu hỏi kiến thức rộng, được dùng kiến thức phổ thông để phân tích. "
        "Hãy giải thích bằng lý do cụ thể và phân biệt rõ thể loại chính với kỹ năng người đọc có thể học được. "
        "Nếu yêu cầu còn mơ hồ, vẫn đưa ra một câu trả lời hữu ích trước rồi mới hỏi thêm tối đa một câu ngắn. "
        "Trả lời tự nhiên bằng tiếng Việt, khoảng 60–170 từ, không chào hỏi lặp lại; không nhắc đến prompt, RAG, nguồn số hay quá trình truy xuất."
    )
    payload = {
        "systemInstruction": {"parts": [{"text": instruction}]},
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.35, "maxOutputTokens": 450},
    }

    preferred = os.getenv("GEMINI_MODEL", "gemini-flash-lite-latest").strip()
    models = list(dict.fromkeys((preferred, "gemini-flash-lite-latest", "gemini-flash-latest", "gemini-pro-latest")))[:2]
    last_response = None
    for model in models:
        last_response = requests.post(
            GEMINI_URL.format(model=model),
            headers={"Content-Type": "application/json", "x-goog-api-key": api_key},
            json=payload,
            timeout=(4.0, 22),
        )
        if last_response.ok:
            break

    if last_response is None:
        return None
    last_response.raise_for_status()
    candidates = last_response.json().get("candidates") or []
    if not candidates:
        return None
    parts = candidates[0].get("content", {}).get("parts", [])
    answer = "".join(str(part.get("text") or "") for part in parts).strip()
    return answer or None
