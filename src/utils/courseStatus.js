// Utility to check if course has started
// Usage: isCourseStarted(courseInfo, now)
// Prefer canonical 'start_date' but fallback to legacy 'start'
export function isCourseStarted(courseInfo, now = new Date()) {
  if (!courseInfo) return false;
  const raw = courseInfo.start_date || courseInfo.start || null;
  if (!raw) return false;
  const startDate = new Date(raw);
  return startDate <= now;
}
