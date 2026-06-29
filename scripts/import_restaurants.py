import csv
import json
import hashlib
import base64
import sys
from pathlib import Path

# 강원 전 시·군 → import-local-datasets.mjs CITY_TO_ZONE 과 동기화
CITY_ZONE = {
    "강릉시": "gangneung-yangyang",
    "양양군": "gangneung-yangyang",
    "속초시": "sokcho-goseong",
    "고성군": "sokcho-goseong",
    "삼척시": "samcheok-donghae",
    "동해시": "samcheok-donghae",
    "태백시": "yeongwol-jeongseon",
    "영월군": "yeongwol-jeongseon",
    "정선군": "yeongwol-jeongseon",
    "평창군": "pyeongchang-jeongseon",
    "횡성군": "pyeongchang-jeongseon",
    "철원군": "cheorwon-dmz",
    "화천군": "cheorwon-dmz",
    "양구군": "cheorwon-dmz",
    "인제군": "cheorwon-dmz",
    "원주시": "wonju-chuncheon",
    "춘천시": "wonju-chuncheon",
    "홍천군": "wonju-chuncheon",
}

path = Path(sys.argv[1])
items = []
with path.open(encoding="cp949") as f:
    reader = csv.reader(f)
    next(reader)
    for row in reader:
        if len(row) < 4:
            continue
        name, biz, cuisine = row[0].strip(), row[1].strip(), row[2].strip()
        addr = ",".join(row[3:]).strip().strip('"')
        city = next((c for c in CITY_ZONE if c in addr), None)
        if not city or not name:
            continue
        digest = base64.urlsafe_b64encode(hashlib.sha1(f"{name}-{addr}".encode()).digest()).decode()[:16]
        items.append(
            {
                "id": f"gw-rest-{digest}",
                "name": name,
                "businessType": biz,
                "cuisineType": cuisine,
                "address": addr,
                "city": city,
                "travelZone": CITY_ZONE[city],
                "source": "gangwon-restaurant",
            }
        )
print(json.dumps(items, ensure_ascii=False))
