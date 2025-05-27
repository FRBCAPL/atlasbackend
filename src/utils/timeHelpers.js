// src/utils/timeHelpers.js

export function parseTime12hTo24h(timeStr) {
  if (!timeStr || typeof timeStr !== "string" || !timeStr.match(/\d/)) {
    return { h: 0, m: 0 };
  }
  const [time, ampm] = timeStr.trim().split(/\s+/);
  let [h, m] = time.split(":").map(Number);
  if (ampm && ampm.toLowerCase() === "pm" && h !== 12) h += 12;
  if (ampm && ampm.toLowerCase() === "am" && h === 12) h = 0;
  return { h, m };
}

export function generateStartTimes(blockStart, blockEnd, intervalMins = 30) {
  const start = parseTime12hTo24h(blockStart);
  const end = parseTime12hTo24h(blockEnd);
  const times = [];
  let date = new Date(0, 0, 0, start.h, start.m);
  const endDate = new Date(0, 0, 0, end.h, end.m);
  while (date <= endDate) {
    const h = date.getHours();
    const m = date.getMinutes();
    let display =
      ((h % 12) || 12) +
      ":" +
      (m < 10 ? "0" : "") +
      m +
      (h < 12 ? " AM" : " PM");
    times.push(display);
    date = new Date(date.getTime() + intervalMins * 60000);
  }
  return times;
}

export function getNextDayOfWeek(dayShort) {
  const dayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const today = new Date();
  const todayDay = today.getDay();
  const targetDay = dayMap[dayShort];
  let daysToAdd = (targetDay - todayDay + 7) % 7;
  if (daysToAdd === 0) daysToAdd = 7;
  const nextDate = new Date(today);
  nextDate.setDate(today.getDate() + daysToAdd);
  return nextDate;
}
