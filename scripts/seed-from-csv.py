"""
KYC CSV 파싱 → Supabase traders + accounts 시딩
비밀번호/PIN/OTP는 저장하지 않음 (보안)
"""
import json
import urllib.request

SUPABASE_URL = "https://okucjwgihcirnilnfdic.supabase.co"
SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9rdWNqd2dpaGNpcm5pbG5mZGljIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzA2MDY4MiwiZXhwIjoyMDg4NjM2NjgyfQ.IUlQ3UHHUZ2om8VcynBnHu8crajNDMP7mSIcXFME8Tw"

HEADERS = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}

def api_post(table, data):
    body = json.dumps(data).encode("utf-8")
    req = urllib.request.Request(f"{SUPABASE_URL}/rest/v1/{table}", body, HEADERS, method="POST")
    try:
        resp = urllib.request.urlopen(req)
        return json.loads(resp.read())
    except Exception as e:
        print(f"  ERROR {table}: {e}")
        if hasattr(e, 'read'):
            print(f"  Detail: {e.read().decode()[:200]}")
        return None

def api_get(table, params=""):
    req = urllib.request.Request(f"{SUPABASE_URL}/rest/v1/{table}?{params}", headers=HEADERS)
    resp = urllib.request.urlopen(req)
    return json.loads(resp.read())

# ============================================================
# 1. 트레이더 등록 (관리자/운용자)
# ============================================================
managers = [
    {"name": "윤성현", "role": "head_trader"},
    {"name": "강정현", "role": "trader"},
    {"name": "이용덕", "role": "trader"},
    {"name": "오수정", "role": "trader"},
    {"name": "김경환", "role": "trader"},
]

# 이미 있는 트레이더 확인
existing = api_get("traders", "select=id,name")
existing_names = {t["name"] for t in existing}

trader_map = {t["name"]: t["id"] for t in existing}

for m in managers:
    if m["name"] in existing_names:
        print(f"  SKIP trader: {m['name']} (이미 존재)")
        continue
    result = api_post("traders", {**m, "status": "active", "metadata": {}})
    if result:
        t = result[0]
        trader_map[t["name"]] = t["id"]
        print(f"  OK trader: {t['name']} ({t['role']}) -> {t['id'][:8]}")

print(f"\n트레이더 맵: {len(trader_map)}명")
for name, tid in trader_map.items():
    print(f"  {name}: {tid[:8]}...")

# ============================================================
# 2. 계정 등록 (KYC별 × 거래소별)
# ============================================================
# CSV 파싱된 데이터 (비밀번호/PIN 제외)
accounts_data = [
    # (분류, KYC이름, 관리자, 영문명, 이메일, 연락처, {거래소: UID})
    ("1-1", "윤성현", "윤성현", "Yun seonghyun", "stonewave67@gmail.com", "010-5567-9336",
     {"Picol": "76349617", "Tapbit": "96908544", "Jucom": "290402859719", "Bitget": "9304415186"}),
    ("1-2", "강정현", "강정현", "Kang jenghyun", "fastcloud808@gmail.com", "010-2394-9809",
     {"Picol": "80673687", "Digifinex": "1725823495", "Jucom": "290404742031", "Bitget": "1882387960"}),
    ("1-3", "김솔아", "강정현", "Kim solah", "darkmint851@gmail.com", "010-7743-3992",
     {"Picol": "20992411", "Tapbit": "96908559", "Digifinex": "1725964500", "Jucom": "290404784850", "Bitget": "3545388047"}),
    ("1-4", "최대길", "강정현", "choi daegil", "jaycrypto0213@gmail.com", "010-8157-0811",
     {"Picol": "94155745", "Tapbit": "96908557", "Digifinex": "1725677499", "Jucom": "290403418549", "Bitget": "2994569677"}),
    ("1-5", "김수환", "이용덕", "suhwan kim", "kswanswan89@gmail.com", "010-8132-0810",
     {"Picol": "22178183", "Tapbit": "96908459", "Digifinex": "1725594619", "Jucom": "290403527505", "Bitget": "4007897160"}),
    ("1-6", "심준보", "이용덕", "shim junbo", "boxgreen010@gmail.com", "010-8173-9809",
     {"Picol": "65806809", "Tapbit": "96908571", "Digifinex": "1725202492", "Jucom": "290404342243", "Bitget": "2788498646"}),
    ("1-7", "최지민", "이용덕", "CHOI JIMIN", "kinbo474@gmail.com", "010-5934-3631",
     {"Picol": "6678 1203", "Tapbit": "96907734", "Digifinex": "1726810086", "Jucom": "290405706583", "Bitget": "4806060242"}),
    ("1-8", "이정빈", "이용덕", "lee jungbin", "openpath752@gmail.com", "010-5641-4711",
     {"Picol": "74398327", "Tapbit": "96908567", "Digifinex": "1725507497", "Jucom": "290420443977", "Bitget": "3548193279"}),
    ("2-1", "2-1", "강정현", "", "nahyeonu504@gmail.com", "010-5568-8156",
     {"Picol": "38868717", "Tapbit": "96898302", "Digifinex": "1730441864", "Jucom": "291106928728", "Bitget": "3797906678"}),
    ("2-2", "2-2", "강정현", "", "ghostdevil1923@gmail.com", "010-5703-2293",
     {"Picol": "88484407", "Tapbit": "96898287", "Digifinex": "1730521883", "Jucom": "291118080670", "Bitget": "6143840020"}),
    ("2-3", "2-3", "강정현", "", "useong7788@gmail.com", "010-8340-3620",
     {"Picol": "17595567", "Tapbit": "96900548", "Digifinex": "1732597651", "Jucom": "292515228308"}),
    ("2-4", "장현구", "강정현", "jang hyun gu", "kwhales1923@gmail.com", "010-8140-3762",
     {"Picol": "23645601", "Tapbit": "96900596", "Digifinex": "1732077661", "Jucom": "292524859774"}),
    ("2-5", "이제현", "강정현", "LEE JEHYEON", "stonebird235@gmail.com", "010-5570-9167",
     {"Picol": "18185079", "Tapbit": "96908562", "Digifinex": "1725481498", "Jucom": "290403994489", "Bitget": "3981923000"}),
    ("2-6", "심기용", "강정현", "", "godopp1923@gmail.com", "010-5535-2293",
     {"Picol": "84998137", "Tapbit": "96898286", "Digifinex": "1730651880", "Jucom": "291116395289", "Bitget": "9457351915"}),
    ("2-7", "유길호", "강정현", "Yu gilho", "gitaebae480@gmail.com", "010-5736-8156",
     {"Picol": "13100769", "Tapbit": "96898285", "Digifinex": "1730834875", "Jucom": "291114912681", "Bitget": "4203341112"}),
    ("2-11", "김경환", "김경환", "Kim kyunghwan", "yongdeok866@gmail.com", "010-8211-9167",
     {"Picol": "17760691", "Tapbit": "96908553", "Digifinex": "1725160502", "Jucom": "290404426665", "Bitget": "1978472122"}),
]

account_count = 0
for code, kyc_name, manager, eng_name, email, phone, exchanges in accounts_data:
    manager_id = trader_map.get(manager)
    if not manager_id:
        print(f"  SKIP {kyc_name}: 관리자 '{manager}' 없음")
        continue

    for exchange, uid in exchanges.items():
        alias = f"{kyc_name}_{exchange}_{code}"
        metadata = {
            "kyc_name": kyc_name,
            "eng_name": eng_name,
            "email": email,
            "phone": phone,
            "uid": uid,
            "code": code,
        }
        result = api_post("accounts", {
            "trader_id": manager_id,
            "alias": alias,
            "exchange": exchange,
            "status": "active",
            "metadata": metadata,
        })
        if result:
            account_count += 1
            if account_count <= 3:
                print(f"  OK account: {alias}")
            elif account_count == 4:
                print(f"  ... (나머지 계정 등록 중)")

print(f"\n=== 완료 ===")
print(f"트레이더: {len(trader_map)}명")
print(f"계정: {account_count}개 등록")
