/**
 * Time utilities for handling active hours consistently across the application
 */

// Time periods with their corresponding hours in 24-hour format
export const TIME_PERIODS = [
  { id: "earlyMorning", name: "Early Morning", hours: ["05:00", "06:00", "07:00"] },
  { id: "morning", name: "Morning", hours: ["08:00", "09:00", "10:00"] },
  { id: "noon", name: "Noon", hours: ["11:00", "12:00", "13:00"] },
  { id: "afternoon", name: "Afternoon", hours: ["14:00", "15:00", "16:00"] },
  { id: "evening", name: "Evening", hours: ["17:00", "18:00", "19:00"] },
  { id: "night", name: "Night", hours: ["20:00", "21:00", "22:00"] },
  { id: "lateNight", name: "Late Night", hours: ["23:00", "00:00", "01:00"] },
  { id: "overnight", name: "Overnight", hours: ["02:00", "03:00", "04:00"] }
];

/**
 * Maps each hour to the period(s) it belongs to
 * Useful for quick lookups
 */
export const HOUR_TO_PERIOD_MAP = {};

// Build the hour-to-period mapping
TIME_PERIODS.forEach(period => {
  period.hours.forEach(hour => {
    if (!HOUR_TO_PERIOD_MAP[hour]) {
      HOUR_TO_PERIOD_MAP[hour] = [];
    }
    HOUR_TO_PERIOD_MAP[hour].push(period.id);
  });
});

/**
 * Converts timezone offset to a standardized format
 * 
 * @param {number} offset - Timezone offset in hours
 * @returns {number} Normalized offset between -12 and 14
 */
export const normalizeTimezoneOffset = (offset) => {
  if (typeof offset !== 'number') return 0;
  return Math.max(-12, Math.min(14, offset));
};

/**
 * Converts an array of active hours to period IDs
 * 
 * @param {Array} activeHours - Array of hours in "HH:MM" format
 * @returns {Array} Array of period IDs that contain these hours
 */
export const hoursToPeriodIds = (activeHours) => {
  if (!activeHours || !Array.isArray(activeHours) || activeHours.length === 0) {
    return [];
  }
  
  // Create a set of unique period IDs
  const periodIds = new Set();
  
  activeHours.forEach(hour => {
    // Look up periods this hour belongs to
    const periods = HOUR_TO_PERIOD_MAP[hour] || [];
    periods.forEach(periodId => periodIds.add(periodId));
  });
  
  return Array.from(periodIds);
};

/**
 * Converts period IDs to the hours they contain
 * 
 * @param {Array} periodIds - Array of period IDs
 * @returns {Array} Array of hours in "HH:MM" format
 */
export const periodIdsToHours = (periodIds) => {
  if (!periodIds || !Array.isArray(periodIds) || periodIds.length === 0) {
    return [];
  }
  
  // Create a set of unique hours
  const hours = new Set();
  
  periodIds.forEach(periodId => {
    const period = TIME_PERIODS.find(p => p.id === periodId);
    if (period) {
      period.hours.forEach(hour => hours.add(hour));
    }
  });
  
  return Array.from(hours).sort();
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
  
  // Convert hours from UTC to local timezone
  const normalizedOffset = normalizeTimezoneOffset(timezoneOffset);
  
  const convertedHours = activeHours.map(hour => {
    const [hourStr, minuteStr] = hour.split(':');
    let hourNum = parseInt(hourStr, 10);
    
    // Apply timezone offset
    hourNum = (hourNum + normalizedOffset + 24) % 24;
    
    // Format back to string with leading zeros
    return `${hourNum.toString().padStart(2, '0')}:${minuteStr}`;
  });
  
  // Track which periods are fully covered
  const periodCoverage = {};
  
  // Initialize all periods as not covered
  TIME_PERIODS.forEach(period => {
    periodCoverage[period.id] = {
      periodName: period.name,
      coveredHours: 0,
      totalHours: period.hours.length
    };
  });
  
  // Count covered hours for each period
  convertedHours.forEach(hour => {
    const periodsForHour = HOUR_TO_PERIOD_MAP[hour] || [];
    periodsForHour.forEach(periodId => {
      if (periodCoverage[periodId]) {
        periodCoverage[periodId].coveredHours += 1;
      }
    });
  });
  
  // Only include fully covered periods
  const fullyCovered = [];
  
  Object.values(periodCoverage).forEach(period => {
    if (period.coveredHours === period.totalHours) {
      // Only include fully covered periods
      fullyCovered.push(period.periodName);
    }
  });
  
  return fullyCovered.length > 0 ? fullyCovered.join(", ") : "Not specified";
}; 