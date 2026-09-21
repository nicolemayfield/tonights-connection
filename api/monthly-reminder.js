// api/monthly-reminder.js
// ─────────────────────────────────────────────────────────────────────────────
// TONIGHT'S CONNECTION — Monthly check-in calendar file
//
// iPhone / iPad Safari can't open a calendar (.ics) file that only exists inside
// the page, so the app opens THIS address instead. It returns a normal calendar
// file with the right content type, and Safari shows its "Add to Calendar" sheet.
//
// It is stateless: it stores nothing and schedules nothing. The recurring
// reminder lives in the person's own calendar (12 monthly occurrences).
//
// Example:  /api/monthly-reminder?start=20261020T190000
//           (start = first reminder, local wall-clock time, YYYYMMDDTHHMMSS)
//
// No environment variables needed.
// ─────────────────────────────────────────────────────────────────────────────

const APP_URL = "https://tonightsconnection.com";
const TITLE = "Tonight's Connection: Monthly Check-In";
const NOTE =
  "Time for your monthly check-in. Open Tonight's Connection to complete this month's check-in and take one intentional step together: " +
  APP_URL;

function pad2(n) {
  return String(n).padStart(2, "0");
}

// Calendar text values must escape backslashes, semicolons, commas, and line breaks.
function icsEscape(text) {
  return String(text)
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

// Calendar lines may not exceed 75 characters; longer lines continue on the next line after a space.
function icsFold(line) {
  const out = [];
  let rest = line;
  while (rest.length > 73) {
    out.push(rest.slice(0, 73));
    rest = " " + rest.slice(73);
  }
  out.push(rest);
  return out.join("\r\n");
}

// Wall-clock stamp with no timezone, so the person's calendar reads it in their own timezone.
function wallClockStamp(d) {
  return (
    `${d.getUTCFullYear()}${pad2(d.getUTCMonth() + 1)}${pad2(d.getUTCDate())}` +
    `T${pad2(d.getUTCHours())}${pad2(d.getUTCMinutes())}00`
  );
}

function buildCalendarFile(start) {
  const m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/.exec(start);
  if (!m) return null;
  const [year, month, day, hour, minute] = m.slice(1, 6).map(Number);
  // Days are limited to 1-28 so every month has the chosen date.
  if (year < 2024 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 28 || hour > 23 || minute > 59) return null;

  const startDate = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  const endDate = new Date(startDate.getTime() + 30 * 60 * 1000);
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Tonight's Connection//Monthly Check-In//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    // Same start time → same event id, so adding it twice updates the event instead of duplicating it.
    `UID:tc-monthly-checkin-${wallClockStamp(startDate)}@tonightsconnection.com`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${wallClockStamp(startDate)}`,
    `DTEND:${wallClockStamp(endDate)}`,
    "RRULE:FREQ=MONTHLY;COUNT=12",
    `SUMMARY:${icsEscape(TITLE)}`,
    `DESCRIPTION:${icsEscape(NOTE)}`,
    `URL:${APP_URL}`,
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${icsEscape(TITLE)}`,
    "TRIGGER:PT0S",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR"
  ];
  return lines.map(icsFold).join("\r\n") + "\r\n";
}

export default function handler(req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    return res.status(405).send("Method not allowed");
  }

  let start = "";
  try {
    start = new URL(req.url, "https://tonightsconnection.com").searchParams.get("start") || "";
  } catch {
    start = "";
  }

  const body = buildCalendarFile(start);
  if (!body) return res.status(400).send("Invalid start time");

  res.setHeader("Content-Type", "text/calendar; charset=utf-8");
  res.setHeader("Content-Disposition", 'inline; filename="Tonights-Connection-Monthly-Check-In.ics"');
  res.setHeader("Cache-Control", "no-store");
  return res.status(200).send(req.method === "HEAD" ? "" : body);
}
