"""
Wanderlust Voyage AI - Branded Email HTML Templates (Liquid Glass 4.0 Pro / Dark Luxe)
Supports full Right-To-Left (RTL) Hebrew typography and responsive email clients.
"""
from typing import Dict, Any, List, Optional
import html


def _base_email_wrapper(content_html: str, preview_text: str = "") -> str:
    """Wraps HTML content in a responsive, high-end Dark Luxe email container."""
    return f"""<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>Wanderlust Voyage AI</title>
    <!--[if mso]>
    <style type="text/css">
    body, table, td {{font-family: Arial, Helvetica, sans-serif !important;}}
    </style>
    <![endif]-->
    <style>
        body {{
            margin: 0;
            padding: 0;
            background-color: #060911;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            color: #f1f5f9;
            direction: rtl;
            text-align: right;
        }}
        table {{
            border-collapse: collapse;
        }}
        a {{
            color: #2dd4bf;
            text-decoration: none;
        }}
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #060911; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #f1f5f9; direction: rtl; text-align: right;">
    <!-- Hidden Preview Preheader -->
    <div style="display: none; max-height: 0; overflow: hidden; font-size: 1px; line-height: 1px; color: #060911;">
        {html.escape(preview_text)} &#847; &zwnj; &nbsp;
    </div>

    <!-- Outer Table Container -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #060911; min-height: 100vh; padding: 32px 12px;">
        <tr>
            <td align="center">
                <!-- Inner Card Container -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 620px; background: linear-gradient(180deg, #0c121e 0%, #070a12 100%); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 24px; box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6); overflow: hidden;">
                    <!-- Brand Gradient Bar -->
                    <tr>
                        <td height="4" style="background: linear-gradient(90deg, #2dd4bf 0%, #38bdf8 50%, #818cf8 100%);"></td>
                    </tr>
                    
                    <!-- Header with Logo -->
                    <tr>
                        <td style="padding: 28px 32px 20px; border-bottom: 1px solid rgba(255, 255, 255, 0.07); text-align: right;" dir="rtl">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                    <td align="right">
                                        <div style="font-size: 18px; font-weight: 800; letter-spacing: 0.5px; color: #ffffff;">
                                            <span style="color: #2dd4bf;">✦</span> WANDERLUST <span style="color: #38bdf8; font-weight: 300;">VOYAGE AI</span>
                                        </div>
                                        <div style="font-size: 11px; color: #94a3b8; margin-top: 3px; font-weight: 400;">
                                            Autonomous Multi-Agent Travel Ecosystem
                                        </div>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Body Content -->
                    <tr>
                        <td style="padding: 32px 32px 24px; text-align: right;" dir="rtl">
                            {content_html}
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding: 24px 32px 32px; background-color: rgba(0, 0, 0, 0.35); border-top: 1px solid rgba(255, 255, 255, 0.06); text-align: center;" dir="rtl">
                            <p style="margin: 0 0 8px; font-size: 12px; color: #64748b; line-height: 1.6;">
                                נוצר ונשלח באהבה ע״י <strong style="color: #94a3b8;">Wanderlust Voyage AI</strong>
                            </p>
                            <p style="margin: 0 0 12px; font-size: 11px; color: #475569;">
                                מופעל באמצעות Google Flow MCP, Agno Multi-Agent Orchestrator ו-Resend
                            </p>
                            <div style="font-size: 11px; color: #475569;">
                                © 2026 Wanderlust Voyage AI. כל הזכויות שמורות.
                            </div>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
"""


def render_trip_briefing_html(
    destination: str,
    duration_days: int,
    total_estimated_usd: float,
    markdown_plan: str,
    frontend_url: str = "http://localhost:3000",
    recipient_name: str = "מטייל יקר",
) -> str:
    """Renders the official Trip Briefing email with dark luxe itinerary summary and action links."""
    safe_dest = html.escape(destination)
    clean_name = html.escape(recipient_name)
    total_nis = int(total_estimated_usd * 3.65)

    # Extract preview snippet from markdown
    plan_lines = [l.strip() for l in markdown_plan.split("\n") if l.strip() and not l.strip().startswith("#")]
    plan_snippet = "<br>".join([html.escape(l) for l in plan_lines[:8]])
    if not plan_snippet:
        plan_snippet = f"תוכנית נסיעה מותאמת אישית ל-{safe_dest} למשך {duration_days} ימים, כולל מלונות מומלצים, טיסות ותקציב."

    content = f"""
    <div style="margin-bottom: 24px;">
        <span style="background: rgba(45, 212, 191, 0.15); color: #2dd4bf; padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: 700; display: inline-block; margin-bottom: 12px;">
            תדריך נסיעה רשמי
        </span>
        <h1 style="margin: 0 0 8px; font-size: 24px; font-weight: 800; color: #ffffff; line-height: 1.3;">
            המסלול שלך ל{safe_dest} מוכן! ✈️
        </h1>
        <p style="margin: 0; font-size: 14px; color: #94a3b8; line-height: 1.6;">
            שלום {clean_name}, צוות סוכני ה-AI של Wanderlust השלים את סנכרון ותכנון החופשה שלך. להלן עיקרי התדריך:
        </p>
    </div>

    <!-- Financial & Logistics Highlight Card -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 16px; margin-bottom: 24px;">
        <tr>
            <td style="padding: 18px 20px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                        <td width="33%" style="text-align: right; vertical-align: top;">
                            <div style="font-size: 11px; color: #94a3b8; margin-bottom: 4px;">יעד מבוקש</div>
                            <div style="font-size: 16px; font-weight: 700; color: #ffffff;">{safe_dest}</div>
                        </td>
                        <td width="33%" style="text-align: center; vertical-align: top;">
                            <div style="font-size: 11px; color: #94a3b8; margin-bottom: 4px;">משך השהות</div>
                            <div style="font-size: 16px; font-weight: 700; color: #38bdf8;">{duration_days} ימים</div>
                        </td>
                        <td width="34%" style="text-align: left; vertical-align: top;">
                            <div style="font-size: 11px; color: #94a3b8; margin-bottom: 4px;">אומדן תקציב</div>
                            <div style="font-size: 16px; font-weight: 800; color: #2dd4bf;">${total_estimated_usd:,.0f} <span style="font-size: 12px; color: #94a3b8;">(~₪{total_nis:,})</span></div>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>

    <!-- Highlights Section -->
    <div style="margin-bottom: 24px;">
        <h3 style="margin: 0 0 10px; font-size: 15px; font-weight: 700; color: #e2e8f0; border-bottom: 1px solid rgba(255, 255, 255, 0.08); padding-bottom: 8px;">
            תקציר המסלול שסונכרן ע״י הסוכנים:
        </h3>
        <div style="background: rgba(0, 0, 0, 0.25); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 12px; padding: 16px; font-size: 13px; line-height: 1.8; color: #cbd5e1;">
            {plan_snippet}
        </div>
    </div>

    <!-- CTA Button -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 28px;">
        <tr>
            <td align="center">
                <a href="{frontend_url}" target="_blank" style="background: linear-gradient(135deg, #2dd4bf 0%, #0d9488 100%); color: #022c22; font-weight: 800; font-size: 14px; padding: 14px 28px; border-radius: 14px; display: inline-block; box-shadow: 0 10px 25px rgba(45, 212, 191, 0.3); text-decoration: none;">
                    צפייה במסלול המלא ועריכה באפליקציה ←
                </a>
            </td>
        </tr>
    </table>
    """
    return _base_email_wrapper(content, preview_text=f"תדריך הנסיעה שלך ל{destination} מוכן!")


def render_welcome_html(
    email: str,
    full_name: Optional[str] = None,
    frontend_url: str = "http://localhost:3000",
) -> str:
    """Renders the Welcome email for newly registered users."""
    display_name = html.escape(full_name or email.split("@")[0].title())

    content = f"""
    <div style="margin-bottom: 24px; text-align: center;">
        <div style="font-size: 40px; margin-bottom: 12px;">🌍</div>
        <h1 style="margin: 0 0 8px; font-size: 26px; font-weight: 800; color: #ffffff;">
            ברוך הבא ל-Wanderlust Voyage AI!
        </h1>
        <p style="margin: 0; font-size: 15px; color: #94a3b8; line-height: 1.6;">
            שלום {display_name}, אנחנו שמחים שהצטרפת לחוויית תכנון הנסיעות החכמה בעולם.
        </p>
    </div>

    <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 16px; padding: 20px; margin-bottom: 24px;">
        <h3 style="margin: 0 0 14px; font-size: 15px; font-weight: 700; color: #2dd4bf;">
            מה מחכה לך במערכת?
        </h3>
        
        <div style="margin-bottom: 12px; font-size: 13px; line-height: 1.6; color: #e2e8f0;">
            <strong style="color: #38bdf8;">✦ סוכני AI אוטונומיים:</strong> מנוע טיסות, איתור מלונות בוטיק, ומחשבון תקציב רב-מטבעי בזמן אמת.
        </div>
        <div style="margin-bottom: 12px; font-size: 13px; line-height: 1.6; color: #e2e8f0;">
            <strong style="color: #38bdf8;">✦ לוח טיסות חגים מנתב״ג:</strong> השוואת טיסות לכל יעדי החגים עם בדיקת שמירת שבת וכבודה מובנית.
        </div>
        <div style="margin-bottom: 0; font-size: 13px; line-height: 1.6; color: #e2e8f0;">
            <strong style="color: #38bdf8;">✦ סנכרון ל-Google Workspace:</strong> העברת תוכניות בלחיצת כפתור ליומן גוגל, גוגל דוקס ומיילים.
        </div>
    </div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 24px;">
        <tr>
            <td align="center">
                <a href="{frontend_url}" target="_blank" style="background: linear-gradient(135deg, #2dd4bf 0%, #0d9488 100%); color: #022c22; font-weight: 800; font-size: 14px; padding: 14px 30px; border-radius: 14px; display: inline-block; box-shadow: 0 10px 25px rgba(45, 212, 191, 0.3);">
                    התחל לתכנן את המסלול הראשון שלך ←
                </a>
            </td>
        </tr>
    </table>
    """
    return _base_email_wrapper(content, preview_text="ברוך הבא ל-Wanderlust Voyage AI - הטיול הבא שלך מתחיל כאן!")


def render_password_reset_html(
    email: str,
    reset_url: str,
    recipient_name: Optional[str] = None,
) -> str:
    """Renders the secure Password Reset email with token action button."""
    display_name = html.escape(recipient_name or email.split("@")[0].title())

    content = f"""
    <div style="margin-bottom: 24px;">
        <span style="background: rgba(239, 68, 68, 0.15); color: #f87171; padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: 700; display: inline-block; margin-bottom: 12px;">
            אבטחת חשבון
        </span>
        <h1 style="margin: 0 0 8px; font-size: 22px; font-weight: 800; color: #ffffff;">
            בקשה לאיפוס סיסמה
        </h1>
        <p style="margin: 0; font-size: 14px; color: #94a3b8; line-height: 1.6;">
            שלום {display_name}, קיבלנו בקשה לאיפוס הסיסמה של חשבונך ב-Wanderlust Voyage AI עבור הכתובת <strong style="color: #cbd5e1;">{html.escape(email)}</strong>.
        </p>
    </div>

    <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 16px; padding: 20px; margin-bottom: 24px; font-size: 13px; line-height: 1.7; color: #cbd5e1;">
        כדי לבחור סיסמה חדשה ולהתחבר לחשבונך, לחץ על הכפתור המאובטח למטה.
        <div style="margin-top: 10px; font-size: 12px; color: #f59e0b;">
            ⚠️ הקישור תקף למשך 60 דקות בלבד.
        </div>
    </div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 28px 0;">
        <tr>
            <td align="center">
                <a href="{reset_url}" target="_blank" style="background: linear-gradient(135deg, #38bdf8 0%, #0284c7 100%); color: #082f49; font-weight: 800; font-size: 14px; padding: 14px 32px; border-radius: 14px; display: inline-block; box-shadow: 0 10px 25px rgba(56, 189, 248, 0.3);">
                    איפוס סיסמה מאובטח ←
                </a>
            </td>
        </tr>
    </table>

    <div style="font-size: 11px; color: #64748b; line-height: 1.6; border-top: 1px solid rgba(255, 255, 255, 0.06); padding-top: 16px;">
        אם לא ביקשת לאפס את הסיסמה, תוכל להתעלם ממייל זה בבטחה – החשבון שלך מאובטח ולא בוצע בו שינוי.
        <br>
        קישור ישיר אם הכפתור אינו פועל: <a href="{reset_url}" style="color: #38bdf8; word-break: break-all;">{reset_url}</a>
    </div>
    """
    return _base_email_wrapper(content, preview_text="הוראות לאיפוס הסיסמה שלך ב-Wanderlust Voyage AI")


def render_flight_board_html(
    holiday_name: str,
    flights: List[Dict[str, Any]],
    search_links: Optional[Dict[str, str]] = None,
    frontend_url: str = "http://localhost:3000",
) -> str:
    """Renders the Ben Gurion TLV Holiday Flight Board into an interactive email table."""
    safe_holiday = html.escape(holiday_name)

    flight_rows_html = ""
    for idx, f in enumerate(flights[:6], 1):
        airline = html.escape(str(f.get("airline", "אל על")))
        dest = html.escape(str(f.get("destination_name", "אירופה")))
        stops_text = html.escape(str(f.get("stops_text", "ישיר")))
        true_total_nis = f.get("true_total_nis", 0)
        base_fare_usd = f.get("base_fare_usd", 0)
        bag_badge = '<span style="color: #2dd4bf; font-size: 10px;">כולל מזוודה</span>' if f.get("bag_included") else '<span style="color: #94a3b8; font-size: 10px;">טרולי בלבד</span>'
        shabbat_badge = '<span style="color: #38bdf8; font-size: 10px;">✓ שומר שבת</span>' if f.get("shabbat_compliant") else ""

        flight_rows_html += f"""
        <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.06);">
            <td style="padding: 12px 8px; font-weight: 700; color: #ffffff; font-size: 13px;">
                #{idx} {dest}
                <div style="font-size: 11px; color: #94a3b8; font-weight: 400;">{airline} • {stops_text}</div>
            </td>
            <td style="padding: 12px 8px; text-align: center; font-size: 11px;">
                {bag_badge}
                <div>{shabbat_badge}</div>
            </td>
            <td style="padding: 12px 8px; text-align: left; font-size: 14px; font-weight: 800; color: #2dd4bf;">
                ₪{true_total_nis:,}
                <div style="font-size: 10px; color: #94a3b8; font-weight: 400;">${base_fare_usd:.0f}</div>
            </td>
        </tr>
        """

    links_html = ""
    if search_links:
        gf = search_links.get("google_flights")
        sk = search_links.get("skyscanner")
        links_html = f"""
        <div style="margin-top: 16px; font-size: 12px; color: #94a3b8; text-align: center;">
            חיפוש מהיר במנועי השוואה: 
            {f'<a href="{gf}" target="_blank" style="color: #38bdf8; margin: 0 4px;">Google Flights</a> | ' if gf else ''}
            {f'<a href="{sk}" target="_blank" style="color: #2dd4bf; margin: 0 4px;">Skyscanner</a>' if sk else ''}
        </div>
        """

    content = f"""
    <div style="margin-bottom: 24px;">
        <span style="background: rgba(56, 189, 248, 0.15); color: #38bdf8; padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: 700; display: inline-block; margin-bottom: 12px;">
            לוח טיסות מנתב״ג
        </span>
        <h1 style="margin: 0 0 8px; font-size: 22px; font-weight: 800; color: #ffffff;">
            לוח טיסות לחופשת {safe_holiday} ✈️
        </h1>
        <p style="margin: 0; font-size: 14px; color: #94a3b8; line-height: 1.6;">
            להלן הטיסות המשתלמות ביותר מנמל התעופה בן גוריון (TLV) שנותחו ע״י סוכן נתב״ג של Wanderlust:
        </p>
    </div>

    <!-- Flight Table -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 16px; overflow: hidden; margin-bottom: 16px;">
        <thead>
            <tr style="background-color: rgba(255, 255, 255, 0.05); border-bottom: 1px solid rgba(255, 255, 255, 0.1);">
                <th style="padding: 10px 8px; text-align: right; font-size: 11px; color: #94a3b8; font-weight: 600;">יעד וחברה</th>
                <th style="padding: 10px 8px; text-align: center; font-size: 11px; color: #94a3b8; font-weight: 600;">כבודה ושבת</th>
                <th style="padding: 10px 8px; text-align: left; font-size: 11px; color: #94a3b8; font-weight: 600;">מחיר סופי</th>
            </tr>
        </thead>
        <tbody>
            {flight_rows_html}
        </tbody>
    </table>

    {links_html}

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 24px;">
        <tr>
            <td align="center">
                <a href="{frontend_url}/flights" target="_blank" style="background: linear-gradient(135deg, #2dd4bf 0%, #0d9488 100%); color: #022c22; font-weight: 800; font-size: 14px; padding: 14px 28px; border-radius: 14px; display: inline-block;">
                    לצפייה בלוח ההמראות המלא בשידור חי ←
                </a>
            </td>
        </tr>
    </table>
    """
    return _base_email_wrapper(content, preview_text=f"לוח הטיסות המומלצות לחופשת {holiday_name} מנתב״ג")


def render_contact_confirmation_html(
    sender_name: str,
    subject: str,
    message: str,
    ticket_id: str,
) -> str:
    """Renders auto-reply confirmation when a contact/feedback inquiry is submitted."""
    safe_name = html.escape(sender_name)
    safe_subj = html.escape(subject)
    safe_msg = html.escape(message[:400])

    content = f"""
    <div style="margin-bottom: 20px;">
        <span style="background: rgba(45, 212, 191, 0.15); color: #2dd4bf; padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: 700; display: inline-block; margin-bottom: 12px;">
            פנייתך התקבלה בהצלחה #{ticket_id}
        </span>
        <h1 style="margin: 0 0 8px; font-size: 22px; font-weight: 800; color: #ffffff;">
            תודה שפנית אלינו, {safe_name}!
        </h1>
        <p style="margin: 0; font-size: 14px; color: #94a3b8; line-height: 1.6;">
            צוות התמיכה והסוכנים של Wanderlust Voyage AI קיבל את הודעתך בנושא: <strong style="color: #cbd5e1;">"{safe_subj}"</strong>.
        </p>
    </div>

    <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 16px; padding: 18px; margin-bottom: 20px;">
        <div style="font-size: 11px; color: #94a3b8; margin-bottom: 6px;">תוכן הפנייה שנקלט במערכת:</div>
        <div style="font-size: 13px; color: #e2e8f0; line-height: 1.7; white-space: pre-wrap;">{safe_msg}</div>
    </div>

    <p style="font-size: 13px; color: #94a3b8; line-height: 1.6;">
        אנו עושים את מירב המאמצים לענות לכל פנייה בתוך פחות מ-24 שעות עסקים.
    </p>
    """
    return _base_email_wrapper(content, preview_text=f"פנייתך בנושא '{subject}' התקבלה ב-Wanderlust")
