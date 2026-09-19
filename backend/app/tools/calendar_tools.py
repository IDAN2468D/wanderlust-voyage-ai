import urllib.parse
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, List, Optional


def generate_trip_calendar_pack(
    destination: str,
    start_date: str,
    duration_days: int,
    structured_days: Optional[List[Dict[str, Any]]] = None,
    flight_info: Optional[Dict[str, Any]] = None,
    hotel_info: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Generates a 1-click Google Calendar template URL and a full multi-event RFC 5545 .ics payload
    for seamless import into Google Calendar, Apple Calendar, and Microsoft Outlook.
    """
    dest = destination.strip()
    days = max(1, duration_days)

    try:
        dt_start = datetime.strptime(start_date, "%Y-%m-%d")
    except Exception:
        dt_start = datetime.now() + timedelta(days=14)

    dt_end = dt_start + timedelta(days=days)

    # 1. Main Google Calendar Web URL for overall vacation span
    start_str = dt_start.strftime("%Y%m%d")
    end_str = (dt_end + timedelta(days=1)).strftime("%Y%m%d")  # inclusive span

    flight_num = flight_info.get("flight_number", "LY-081") if flight_info else "LY-081"
    hotel_name = hotel_info.get("name", f"מלון נבחר ב{dest}") if hotel_info else f"מלון נבחר ב{dest}"

    title = f"✈️ חופשה ב{dest} | Wanderlust Voyage AI"
    details = (
        f"תוכנית חופשה מלאה עבור {dest} ({days} ימים)\n\n"
        f"✈️ טיסה הלוך: {flight_num}\n"
        f"🏨 מלון: {hotel_name}\n\n"
        f"נוצר אוטונומית על ידי Wanderlust Voyage AI Multi-Agent Engine"
    )

    gcal_params = {
        "action": "TEMPLATE",
        "text": title,
        "dates": f"{start_str}/{end_str}",
        "details": details,
        "location": dest,
    }
    gcal_url = f"https://calendar.google.com/calendar/render?{urllib.parse.urlencode(gcal_params)}"

    # 2. Construct Complete RFC 5545 iCalendar (.ics) with multi-day itemized events
    dt_now_stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    ics_lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Wanderlust Voyage AI//Travel Planner 2026//HE",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        f"X-WR-CALNAME:חופשה ב{dest}",
        "X-WR-TIMEZONE:UTC",
    ]

    # Add Flight Event (Departure Day)
    dep_start = dt_start.strftime("%Y%m%dT060000Z")
    dep_end = dt_start.strftime("%Y%m%dT110000Z")
    ics_lines.extend([
        "BEGIN:VEVENT",
        f"UID:flight-dep-{start_date}@{dest.lower()}",
        f"DTSTAMP:{dt_now_stamp}",
        f"DTSTART:{dep_start}",
        f"DTEND:{dep_end}",
        f"SUMMARY:✈️ טיסה הלוך ל{dest} ({flight_num})",
        f"DESCRIPTION:טיסה ל{dest}. התייצבות בשדה 3 שעות לפני ההמראה.",
        f"LOCATION:נמל התעופה בן גוריון (TLV)",
        "STATUS:CONFIRMED",
        "BEGIN:VALARM",
        "TRIGGER:-PT3H",
        "ACTION:DISPLAY",
        "DESCRIPTION:תזכורת: יציאה לשדה התעופה לטיסה ל{dest}",
        "END:VALARM",
        "END:VEVENT",
    ])

    # Add Day-by-Day Itinerary Events if available
    if structured_days:
        for day in structured_days:
            day_num = day.get("day_number", 1)
            current_day_dt = dt_start + timedelta(days=day_num - 1)
            day_date_str = current_day_dt.strftime("%Y%m%d")

            morning_act = day.get("morning", {}).get("activity", f"סיור בוקר ב{dest}")
            afternoon_act = day.get("afternoon", {}).get("activity", f"אטרקציית צהריים ב{dest}")
            dining = day.get("afternoon", {}).get("dining", f"ארוחת צהריים ב{dest}")
            evening_act = day.get("evening", {}).get("activity", f"ערב ב{dest}")
            tip = day.get("local_tip", "")

            # Morning Activity Event
            ics_lines.extend([
                "BEGIN:VEVENT",
                f"UID:day-{day_num}-morning@{dest.lower()}",
                f"DTSTAMP:{dt_now_stamp}",
                f"DTSTART:{day_date_str}T090000Z",
                f"DTEND:{day_date_str}T123000Z",
                f"SUMMARY:🏛️ {morning_act} (יום {day_num})",
                f"DESCRIPTION:{day.get('morning', {}).get('highlight', '')}\\nטיפ מקומי: {tip}",
                f"LOCATION:{morning_act}, {dest}",
                "STATUS:CONFIRMED",
                "END:VEVENT",
            ])

            # Afternoon Dining Event
            ics_lines.extend([
                "BEGIN:VEVENT",
                f"UID:day-{day_num}-dining@{dest.lower()}",
                f"DTSTAMP:{dt_now_stamp}",
                f"DTSTART:{day_date_str}T130000Z",
                f"DTEND:{day_date_str}T150000Z",
                f"SUMMARY:🍽️ {dining} (צהריים יום {day_num})",
                f"DESCRIPTION:מנת דגל מומלצת: {day.get('afternoon', {}).get('signature_dish', '')}",
                f"LOCATION:{dining}, {dest}",
                "STATUS:CONFIRMED",
                "END:VEVENT",
            ])

            # Afternoon / Evening Activity
            ics_lines.extend([
                "BEGIN:VEVENT",
                f"UID:day-{day_num}-evening@{dest.lower()}",
                f"DTSTAMP:{dt_now_stamp}",
                f"DTSTART:{day_date_str}T170000Z",
                f"DTEND:{day_date_str}T203000Z",
                f"SUMMARY:🌆 {afternoon_act} / {evening_act}",
                f"DESCRIPTION:{evening_act}",
                f"LOCATION:{dest}",
                "STATUS:CONFIRMED",
                "END:VEVENT",
            ])

    # End calendar
    ics_lines.append("END:VCALENDAR")
    ical_content = "\r\n".join(ics_lines)

    return {
        "destination": dest,
        "google_calendar_url": gcal_url,
        "event_title": title,
        "event_details": details,
        "ical_data": ical_content,
        "days_count": days,
    }
