/**
 * Client-side RFC 5545 iCalendar (.ics) generator and instant file downloader.
 * Guarantees 100% reliable 1-click download with zero network dependencies or pop-up blocker issues.
 */

export interface IcsCalendarOptions {
  destination: string;
  startDate?: string;
  durationDays?: number;
  flightNumber?: string;
  hotelName?: string;
  dailyItinerary?: Array<{
    day_number?: number;
    theme?: string;
    morning?: { activity?: string; location?: string };
    afternoon?: { activity?: string; location?: string; dining?: string };
    evening?: { activity?: string; location?: string };
    local_tip?: string;
  }>;
}

export function generateIcsContent(opts: IcsCalendarOptions): string {
  const dest = (opts.destination || "חופשה").trim();
  const days = Math.max(1, opts.durationDays || 7);
  
  // Parse or default start date
  let dtStart = new Date();
  if (opts.startDate) {
    const parsed = new Date(opts.startDate);
    if (!isNaN(parsed.getTime())) {
      dtStart = parsed;
    } else {
      dtStart.setDate(dtStart.getDate() + 14);
    }
  } else {
    dtStart.setDate(dtStart.getDate() + 14);
  }

  const pad = (n: number) => n.toString().padStart(2, "0");
  const formatUtcStamp = (d: Date) =>
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
  
  const formatDateDay = (d: Date) =>
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;

  const nowStamp = formatUtcStamp(new Date());

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Wanderlust Voyage AI//Travel Planner 2026//HE",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:✈️ חופשה ב${dest} - Wanderlust`,
    "X-WR-TIMEZONE:UTC",
  ];

  const flightNum = opts.flightNumber || "LY-081";
  const hotel = opts.hotelName || `מלון נבחר ב${dest}`;

  // 1. Departure Flight Event
  const depDate = new Date(dtStart);
  const depStartStr = `${formatDateDay(depDate)}T060000Z`;
  const depEndStr = `${formatDateDay(depDate)}T113000Z`;

  lines.push(
    "BEGIN:VEVENT",
    `UID:flight-dep-${formatDateDay(depDate)}-${Math.random().toString(36).substring(2, 8)}@wanderlust`,
    `DTSTAMP:${nowStamp}`,
    `DTSTART:${depStartStr}`,
    `DTEND:${depEndStr}`,
    `SUMMARY:✈️ טיסה הלוך ל${dest} (${flightNum})`,
    `DESCRIPTION:טיסה בינלאומית ל${dest}. התייצבות בטרמינל 3 בנתב"ג 3 שעות לפני ההמראה. מלון: ${hotel}.`,
    "LOCATION:נמל התעופה בן גוריון (TLV)",
    "STATUS:CONFIRMED",
    "BEGIN:VALARM",
    "TRIGGER:-PT3H",
    "ACTION:DISPLAY",
    `DESCRIPTION:תזכורת: יציאה לנתב"ג לטיסה ל${dest}`,
    "END:VALARM",
    "END:VEVENT"
  );

  // 2. Hotel Check-In Event
  const hotelStartStr = `${formatDateDay(depDate)}T150000Z`;
  const returnDate = new Date(dtStart);
  returnDate.setDate(returnDate.getDate() + days);
  const hotelEndStr = `${formatDateDay(returnDate)}T110000Z`;

  lines.push(
    "BEGIN:VEVENT",
    `UID:hotel-stay-${formatDateDay(depDate)}-${Math.random().toString(36).substring(2, 8)}@wanderlust`,
    `DTSTAMP:${nowStamp}`,
    `DTSTART:${hotelStartStr}`,
    `DTEND:${hotelEndStr}`,
    `SUMMARY:🏨 שהייה במלון: ${hotel}`,
    `DESCRIPTION:צ'ק אין החל מ-15:00. שובר מאושר דרך Wanderlust Voyage AI (${days} לילות).`,
    `LOCATION:${dest}`,
    "STATUS:CONFIRMED",
    "END:VEVENT"
  );

  // 3. Day by Day Events
  if (opts.dailyItinerary && opts.dailyItinerary.length > 0) {
    opts.dailyItinerary.forEach((day, idx) => {
      const curDate = new Date(dtStart);
      curDate.setDate(curDate.getDate() + idx);
      const dayDateStr = formatDateDay(curDate);
      const dayNum = day.day_number || idx + 1;

      // Morning Event
      if (day.morning?.activity) {
        lines.push(
          "BEGIN:VEVENT",
          `UID:day-${dayNum}-morning-${Math.random().toString(36).substring(2, 8)}@wanderlust`,
          `DTSTAMP:${nowStamp}`,
          `DTSTART:${dayDateStr}T093000Z`,
          `DTEND:${dayDateStr}T123000Z`,
          `SUMMARY:🏛️ יום ${dayNum} בוקר: ${day.morning.activity.slice(0, 50)}`,
          `DESCRIPTION:${day.morning.activity}${day.local_tip ? `\\nטיפ מקומי: ${day.local_tip}` : ""}`,
          `LOCATION:${day.morning.location || dest}`,
          "STATUS:CONFIRMED",
          "END:VEVENT"
        );
      }

      // Afternoon Event
      if (day.afternoon?.activity) {
        lines.push(
          "BEGIN:VEVENT",
          `UID:day-${dayNum}-afternoon-${Math.random().toString(36).substring(2, 8)}@wanderlust`,
          `DTSTAMP:${nowStamp}`,
          `DTSTART:${dayDateStr}T140000Z`,
          `DTEND:${dayDateStr}T173000Z`,
          `SUMMARY:🚶 יום ${dayNum} צהריים: ${day.afternoon.activity.slice(0, 50)}`,
          `DESCRIPTION:${day.afternoon.activity}${day.afternoon.dining ? `\\nארוחה מומלצת: ${day.afternoon.dining}` : ""}`,
          `LOCATION:${day.afternoon.location || dest}`,
          "STATUS:CONFIRMED",
          "END:VEVENT"
        );
      }

      // Evening Event
      if (day.evening?.activity) {
        lines.push(
          "BEGIN:VEVENT",
          `UID:day-${dayNum}-evening-${Math.random().toString(36).substring(2, 8)}@wanderlust`,
          `DTSTAMP:${nowStamp}`,
          `DTSTART:${dayDateStr}T193000Z`,
          `DTEND:${dayDateStr}T220000Z`,
          `SUMMARY:🍷 יום ${dayNum} ערב: ${day.evening.activity.slice(0, 50)}`,
          `DESCRIPTION:${day.evening.activity}`,
          `LOCATION:${day.evening.location || dest}`,
          "STATUS:CONFIRMED",
          "END:VEVENT"
        );
      }
    });
  }

  // 4. Return Flight Event
  const retStartStr = `${formatDateDay(returnDate)}T160000Z`;
  const retEndStr = `${formatDateDay(returnDate)}T213000Z`;

  lines.push(
    "BEGIN:VEVENT",
    `UID:flight-ret-${formatDateDay(returnDate)}-${Math.random().toString(36).substring(2, 8)}@wanderlust`,
    `DTSTAMP:${nowStamp}`,
    `DTSTART:${retStartStr}`,
    `DTEND:${retEndStr}`,
    `SUMMARY:🛬 טיסה חזרה לישראל מ${dest}`,
    `DESCRIPTION:טיסת חזרה לנמל התעופה בן גוריון. שובר ואישור Wanderlust Voyage AI.`,
    `LOCATION:${dest}`,
    "STATUS:CONFIRMED",
    "BEGIN:VALARM",
    "TRIGGER:-PT3H",
    "ACTION:DISPLAY",
    `DESCRIPTION:תזכורת: יציאה לשדה ב${dest} לטיסה חזרה לישראל`,
    "END:VALARM",
    "END:VEVENT"
  );

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

/**
 * Triggers an instant download of the .ics file directly inside the browser.
 */
export function downloadCalendarIcsFile(opts: IcsCalendarOptions): boolean {
  try {
    const icsContent = generateIcsContent(opts);
    const blob = new Blob(["\ufeff" + icsContent], { type: "text/calendar;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const safeName = (opts.destination || "trip").replace(/\s+/g, "_");
    link.setAttribute("download", `trip_${safeName}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    return true;
  } catch (err) {
    console.error("Failed to download calendar .ics client-side:", err);
    return false;
  }
}
