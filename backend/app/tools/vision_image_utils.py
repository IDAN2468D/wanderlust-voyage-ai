"""
Image fetching, EXIF GPS extraction, and filename hygiene helpers for Vision Match.
Supports downloading external image URLs (and OpenGraph og:image pages) into raw bytes
for Gemini Vision multimodal analysis, plus offline JPEG EXIF GPS geolocation.
"""
import base64
import html
import logging
import math
import os
import re
import struct
from typing import Dict, List, Optional, Tuple
from urllib.parse import urljoin

import httpx

logger = logging.getLogger("vision_image_utils")

MAX_IMAGE_BYTES = 10 * 1024 * 1024
GENERIC_FILENAME_PATTERNS = re.compile(
    r"^(?:pasted[-_\s]*screenshot|screenshot|screen[-_\s]*shot|whatsapp[-_\s]*image|"
    r"צילום[-_\s]*מסך|img|image|photo|picture|pic|dsc|pxl|capture|untitled|file|download)"
    r"(?:[\s._-]*(?:\d+|at|am|pm|copy|edited|\(\d+\)))*$",
    re.IGNORECASE,
)

GPS_CITY_ANCHORS: List[Tuple[str, float, float]] = [
    ("Paris", 48.8566, 2.3522),
    ("London", 51.5074, -0.1278),
    ("Rome", 41.9028, 12.4964),
    ("Santorini", 36.4166, 25.4324),
    ("Athens", 37.9838, 23.7275),
    ("Barcelona", 41.3874, 2.1686),
    ("Madrid", 40.4168, -3.7038),
    ("Lisbon", 38.7223, -9.1393),
    ("Amsterdam", 52.3676, 4.9041),
    ("Prague", 50.0755, 14.4378),
    ("Vienna", 48.2082, 16.3738),
    ("Budapest", 47.4979, 19.0402),
    ("Berlin", 52.5200, 13.4050),
    ("Swiss Alps", 46.0207, 7.7491),
    ("Istanbul", 41.0082, 28.9784),
    ("Dubai", 25.2048, 55.2708),
    ("New York", 40.7128, -74.0060),
    ("Tokyo", 35.6762, 139.6503),
    ("Bangkok", 13.7563, 100.5018),
    ("Bali", -8.5069, 115.2625),
    ("Jerusalem", 31.7683, 35.2137),
    ("Tel Aviv", 32.0853, 34.7818),
    ("Eilat", 29.5577, 34.9519),
    ("Venice", 45.4408, 12.3155),
    ("Florence", 43.7696, 11.2558),
    ("Milan", 45.4642, 9.1900),
]


def detect_image_mime(data: bytes, fallback_mime: str = "image/jpeg") -> str:
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if data.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if data.startswith(b"RIFF") and len(data) >= 12 and data[8:12] == b"WEBP":
        return "image/webp"
    if data.startswith((b"GIF87a", b"GIF89a")):
        return "image/gif"
    normalized = (fallback_mime or "image/jpeg").split(";")[0].strip().lower()
    if normalized == "image/jpg":
        return "image/jpeg"
    if normalized.startswith("image/"):
        return normalized
    return "image/jpeg"


def decode_base64_image(image_base64: str) -> Tuple[bytes, str]:
    raw = image_base64.strip()
    mime_type = "image/jpeg"
    if raw.startswith("data:") and ";base64," in raw:
        header, raw = raw.split(";base64,", 1)
        mime_type = header.replace("data:", "") or "image/jpeg"
    img_bytes = base64.b64decode(raw)
    return img_bytes, detect_image_mime(img_bytes, mime_type)


def clean_upload_filename_hint(file_name: Optional[str]) -> Optional[str]:
    if not file_name:
        return None
    stem = os.path.splitext(os.path.basename(file_name))[0]
    cleaned = re.sub(r"[-_]+", " ", stem).strip()
    cleaned_no_dates = re.sub(r"\b\d{4}[-.\s]?\d{2}[-.\s]?\d{2}(?:\s+at\s+\d{1,2}[:.]\d{2}(?:[:.]\d{2})?)?", "", cleaned, flags=re.IGNORECASE).strip()
    if not cleaned_no_dates or GENERIC_FILENAME_PATTERNS.match(cleaned) or GENERIC_FILENAME_PATTERNS.match(cleaned_no_dates):
        return None
    return cleaned_no_dates[:60]


def _extract_html_meta(html_text: str, base_url: str) -> Tuple[Optional[str], Optional[str]]:
    title_parts: List[str] = []
    og_image: Optional[str] = None
    for prop in ("og:title", "twitter:title", "og:description"):
        m = re.search(
            rf'<meta[^>]+(?:property|name)=["\']{re.escape(prop)}["\'][^>]+content=["\']([^"\']+)["\']',
            html_text,
            re.IGNORECASE,
        )
        if m:
            title_parts.append(html.unescape(m.group(1).strip()))
    title_match = re.search(r"<title[^>]*>(.*?)</title>", html_text, re.IGNORECASE | re.DOTALL)
    if title_match:
        title_parts.append(html.unescape(re.sub(r"\s+", " ", title_match.group(1)).strip()))
    img_match = re.search(
        r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)["\']',
        html_text,
        re.IGNORECASE,
    ) or re.search(
        r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:image["\']',
        html_text,
        re.IGNORECASE,
    )
    if img_match:
        og_image = urljoin(base_url, html.unescape(img_match.group(1).strip()))
    hint = " | ".join(dict.fromkeys(p for p in title_parts if p))[:220] or None
    return og_image, hint


def fetch_image_from_url(url: str) -> Tuple[Optional[bytes], Optional[str], Optional[str]]:
    """
    Download raw image bytes from an http(s) URL (or og:image from a webpage URL).
    Returns (image_bytes, mime_type, metadata_hint).
    """
    clean_url = (url or "").strip()
    if not clean_url.lower().startswith(("http://", "https://")):
        return None, None, None
    if os.getenv("PYTEST_CURRENT_TEST") and not os.getenv("ALLOW_PYTEST_IMAGE_FETCH"):
        return None, None, None

    headers = {
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36",
        "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
    }
    try:
        with httpx.Client(follow_redirects=True, timeout=8.0, headers=headers) as client:
            resp = client.get(clean_url)
            if resp.status_code >= 400:
                logger.warning("URL image fetch HTTP %s for %s", resp.status_code, clean_url)
                return None, None, None
            content_type = (resp.headers.get("content-type") or "").lower()
            disp = resp.headers.get("content-disposition") or ""
            raw = resp.content[:MAX_IMAGE_BYTES]

            if content_type.startswith("image/") or detect_image_mime(raw, "") in (
                "image/png",
                "image/jpeg",
                "image/webp",
                "image/gif",
            ):
                if len(raw) > 32:
                    return raw, detect_image_mime(raw, content_type), disp or None

            if "text/html" in content_type or raw.lstrip()[:20].lower().startswith((b"<!doctype", b"<html")):
                html_str = raw[:200_000].decode("utf-8", errors="ignore")
                og_img_url, page_hint = _extract_html_meta(html_str, str(resp.url))
                if og_img_url and og_img_url.lower().startswith(("http://", "https://")):
                    img_resp = client.get(og_img_url)
                    if img_resp.status_code < 400 and len(img_resp.content) > 32:
                        img_raw = img_resp.content[:MAX_IMAGE_BYTES]
                        img_ct = (img_resp.headers.get("content-type") or "").lower()
                        return img_raw, detect_image_mime(img_raw, img_ct), page_hint
                return None, None, page_hint
    except Exception as exc:
        logger.warning("Failed fetching external image URL %s: %s", clean_url, exc)
    return None, None, None


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = math.radians(lat2 - lat1), math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _read_exif_rational(tiff: bytes, offset: int, endian: str) -> float:
    num, den = struct.unpack_from(f"{endian}II", tiff, offset)
    return float(num) / float(den) if den else 0.0


def extract_exif_gps_coords(img_bytes: bytes) -> Optional[Tuple[float, float]]:
    """Pure-Python JPEG EXIF GPS coordinate extractor (no Pillow dependency)."""
    if not img_bytes or not img_bytes.startswith(b"\xff\xd8"):
        return None
    idx = 2
    length = len(img_bytes)
    tiff: Optional[bytes] = None
    while idx + 4 <= length:
        if img_bytes[idx] != 0xFF:
            break
        marker = img_bytes[idx + 1]
        if marker in (0xDA, 0xD9):
            break
        seg_len = struct.unpack_from(">H", img_bytes, idx + 2)[0]
        if marker == 0xE1 and img_bytes[idx + 4:idx + 10] == b"Exif\x00\x00":
            tiff = img_bytes[idx + 10:idx + 2 + seg_len]
            break
        idx += 2 + seg_len
    if not tiff or len(tiff) < 8:
        return None

    endian = "<" if tiff[:2] == b"II" else (">" if tiff[:2] == b"MM" else "")
    if not endian:
        return None
    ifd0_offset = struct.unpack_from(f"{endian}I", tiff, 4)[0]
    if ifd0_offset + 2 > len(tiff):
        return None

    gps_ifd_offset: Optional[int] = None
    entries = struct.unpack_from(f"{endian}H", tiff, ifd0_offset)[0]
    for i in range(entries):
        pos = ifd0_offset + 2 + i * 12
        if pos + 12 > len(tiff):
            break
        tag, _, _, val_offset = struct.unpack_from(f"{endian}HHII", tiff, pos)
        if tag == 0x8825:
            gps_ifd_offset = val_offset
            break
    if gps_ifd_offset is None or gps_ifd_offset + 2 > len(tiff):
        return None

    gps_tags: Dict[int, Tuple[int, int, int]] = {}
    gps_entries = struct.unpack_from(f"{endian}H", tiff, gps_ifd_offset)[0]
    for i in range(gps_entries):
        pos = gps_ifd_offset + 2 + i * 12
        if pos + 12 > len(tiff):
            break
        tag, ftype, count, val_offset = struct.unpack_from(f"{endian}HHII", tiff, pos)
        gps_tags[tag] = (ftype, count, val_offset)

    if 2 not in gps_tags or 4 not in gps_tags:
        return None
    try:
        lat_off = gps_tags[2][2]
        lon_off = gps_tags[4][2]
        lat_vals = [_read_exif_rational(tiff, lat_off + k * 8, endian) for k in range(3)]
        lon_vals = [_read_exif_rational(tiff, lon_off + k * 8, endian) for k in range(3)]
        lat = lat_vals[0] + lat_vals[1] / 60.0 + lat_vals[2] / 3600.0
        lon = lon_vals[0] + lon_vals[1] / 60.0 + lon_vals[2] / 3600.0
        if 1 in gps_tags:
            lat_ref_raw = struct.pack(f"{endian}I", gps_tags[1][2])
            if b"S" in lat_ref_raw:
                lat = -lat
        if 3 in gps_tags:
            lon_ref_raw = struct.pack(f"{endian}I", gps_tags[3][2])
            if b"W" in lon_ref_raw:
                lon = -lon
        if -90.0 <= lat <= 90.0 and -180.0 <= lon <= 180.0 and (lat != 0.0 or lon != 0.0):
            return (round(lat, 6), round(lon, 6))
    except Exception:
        return None
    return None


def match_nearest_city_from_gps(img_bytes: bytes, max_km: float = 90.0) -> Optional[str]:
    coords = extract_exif_gps_coords(img_bytes)
    if not coords:
        return None
    lat, lon = coords
    best_city: Optional[str] = None
    best_dist = float("inf")
    for city, clat, clon in GPS_CITY_ANCHORS:
        d = _haversine_km(lat, lon, clat, clon)
        if d < best_dist:
            best_dist = d
            best_city = city
    if best_city and best_dist <= max_km:
        return best_city
    return None
