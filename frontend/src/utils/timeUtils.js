/**
 * Time utilities for handling active hours consistently across the application
 */

// Time periods with their corresponding hours in 24-hour format
export const TIME_PERIODS = [
  { id: "earlyMorning", name: "Early Morning", hours: ["05:00", "06:00", "07:00", "08:00"] },
  { id: "morning", name: "Morning", hours: ["08:00", "09:00", "10:00", "11:00"] },
  { id: "noon", name: "Noon", hours: ["11:00", "12:00", "13:00", "14:00"] },
  { id: "afternoon", name: "Afternoon", hours: ["14:00", "15:00", "16:00", "17:00"] },
  { id: "evening", name: "Evening", hours: ["17:00", "18:00", "19:00", "20:00"] },
  { id: "night", name: "Night", hours: ["20:00", "21:00", "22:00", "23:00"] },
  { id: "lateNight", name: "Late Night", hours: ["23:00", "00:00", "01:00", "02:00"] },
  { id: "overnight", name: "Overnight", hours: ["02:00", "03:00", "04:00", "05:00"] }
];

/**
 * Converts individual hours to period IDs
 * 
 * @param {Array} hoursList - Array of hours in "HH:MM" format
 * @returns {Array} Array of period IDs that contain any of the specified hours
 */
export const hoursToPeriodIds = (hoursList) => {
  if (!hoursList || !Array.isArray(hoursList)) return [];
  
  return TIME_PERIODS
    .filter(period => {
      // A period is selected if ANY of its hours are in the hoursList
      return period.hours.some(hour => hoursList.includes(hour));
    })
    .map(period => period.id);
};

/**
 * Converts period IDs to individual hours
 * 
 * @param {Array} periodIds - Array of period IDs
 * @returns {Array} Array of all unique hours from the selected periods
 */
export const periodIdsToHours = (periodIds) => {
  if (!periodIds || !Array.isArray(periodIds)) return [];
  
  // Get all hours from the selected periods
  const hours = TIME_PERIODS
    .filter(period => periodIds.includes(period.id))
    .flatMap(period => period.hours);
  
  // Remove duplicates (hours that appear in multiple periods)
  return [...new Set(hours)];
};

/**
 * Formats an array of active hours into a readable string
 * 
 * @param {Array} activeHours - Array of hours in "HH:MM" format
 * @param {number} timezoneOffset - User's timezone offset in hours
 * @returns {string} Formatted string representing active periods
 */
export const formatActiveHours = (activeHours, timezoneOffset = 0) => {
  if (!activeHours || !Array.isArray(activeHours) || activeHours.length === 0) {
    return "Not specified";
  }
  
  // Get the period IDs from active hours
  const activePeriodIds = hoursToPeriodIds(activeHours);
  
  // For each period, check if ALL hours are active
  const fullyActivePeriods = TIME_PERIODS.filter(period => 
    period.hours.every(hour => activeHours.includes(hour))
  ).map(period => period.name);
  
  return fullyActivePeriods.length > 0 ? fullyActivePeriods.join(", ") : "Not specified";
}; 