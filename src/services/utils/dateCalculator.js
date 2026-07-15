/**
 * src/services/utils/dateCalculator.js
 * 
 * Centralized date calculation utilities for payroll, invoicing, and reporting.
 * Uses dayjs for reliable date math (timezone-safe, immutable, lightweight).
 */

const dayjs = require('dayjs');
const isSameOrBefore = require('dayjs/plugin/isSameOrBefore');
const isSameOrAfter = require('dayjs/plugin/isSameOrAfter');
const isBetween = require('dayjs/plugin/isBetween');
const customParseFormat = require('dayjs/plugin/customParseFormat');

dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);
dayjs.extend(isBetween);
dayjs.extend(customParseFormat);

/**
 * Get the number of days in a given month/year.
 * @param {number} month - 1-indexed (1=Jan, 12=Dec)
 * @param {number} year 
 * @returns {number}
 */
function daysInMonth(month, year) {
  return dayjs(`${year}-${String(month).padStart(2, '0')}-01`).daysInMonth();
}

/**
 * Calculate pro-rata salary for a partial month.
 * @param {number} monthlySalary - Full monthly salary
 * @param {number} daysWorked - Actual days worked
 * @param {number} totalDays - Total days in the month
 * @returns {{ dailyRate: string, proRataSalary: string, daysWorked: number, totalDays: number }}
 */
function calculateProRata(monthlySalary, daysWorked, totalDays) {
  const Decimal = require('decimal.js');
  const salary = new Decimal(monthlySalary);
  const dailyRate = salary.dividedBy(totalDays);
  const proRata = dailyRate.times(daysWorked);

  return {
    dailyRate: dailyRate.toFixed(2),
    proRataSalary: proRata.toFixed(2),
    daysWorked,
    totalDays,
  };
}

/**
 * Calculate the next date based on a frequency.
 * Handles month-end edge cases (e.g., Jan 31 + 1 month = Feb 28).
 * @param {string|Date} currentDate - ISO date string or Date object
 * @param {'weekly'|'biweekly'|'monthly'|'quarterly'|'yearly'} frequency 
 * @returns {string} Next date as ISO string (YYYY-MM-DD)
 */
function calculateNextDate(currentDate, frequency) {
  const date = dayjs(currentDate);

  switch (frequency) {
    case 'weekly':
      return date.add(7, 'day').format('YYYY-MM-DD');
    case 'biweekly':
      return date.add(14, 'day').format('YYYY-MM-DD');
    case 'monthly':
      return date.add(1, 'month').format('YYYY-MM-DD');
    case 'quarterly':
      return date.add(3, 'month').format('YYYY-MM-DD');
    case 'yearly':
      return date.add(1, 'year').format('YYYY-MM-DD');
    default:
      throw new Error(`Unknown frequency: ${frequency}`);
  }
}

/**
 * Get the Indian Financial Year start date for a given date.
 * Indian FY runs April 1 to March 31.
 * @param {string|Date} date 
 * @returns {{ start: string, end: string, label: string }}
 */
function getIndianFinancialYear(date) {
  const d = dayjs(date);
  const month = d.month(); // 0-indexed (0=Jan)
  const year = d.year();

  // FY starts April (month index 3)
  const fyStartYear = month >= 3 ? year : year - 1;
  const fyEndYear = fyStartYear + 1;

  return {
    start: `${fyStartYear}-04-01`,
    end: `${fyEndYear}-03-31`,
    label: `FY ${fyStartYear}-${String(fyEndYear).slice(-2)}`,
  };
}

/**
 * Get the number of working days between two dates (excludes Sundays).
 * @param {string|Date} startDate 
 * @param {string|Date} endDate 
 * @returns {number}
 */
function getWorkingDays(startDate, endDate) {
  let start = dayjs(startDate);
  const end = dayjs(endDate);
  let count = 0;

  while (start.isSameOrBefore(end, 'day')) {
    if (start.day() !== 0) { // 0 = Sunday
      count++;
    }
    start = start.add(1, 'day');
  }

  return count;
}

/**
 * Calculate years of service (for gratuity calculations).
 * Rounds down to nearest integer.
 * @param {string|Date} joinDate 
 * @param {string|Date} [asOf=today] 
 * @returns {number}
 */
function yearsOfService(joinDate, asOf) {
  const join = dayjs(joinDate);
  const now = asOf ? dayjs(asOf) : dayjs();
  return now.diff(join, 'year');
}

/**
 * Calculate months of service.
 * @param {string|Date} joinDate 
 * @param {string|Date} [asOf=today] 
 * @returns {number}
 */
function monthsOfService(joinDate, asOf) {
  const join = dayjs(joinDate);
  const now = asOf ? dayjs(asOf) : dayjs();
  return now.diff(join, 'month');
}

/**
 * Check if a date falls within a given month/year.
 * @param {string|Date} date 
 * @param {number} month - 1-indexed
 * @param {number} year 
 * @returns {boolean}
 */
function isInMonth(date, month, year) {
  const d = dayjs(date);
  return d.month() === month - 1 && d.year() === year;
}

/**
 * Get the first and last day of a month.
 * @param {number} month - 1-indexed
 * @param {number} year 
 * @returns {{ firstDay: string, lastDay: string }}
 */
function getMonthBounds(month, year) {
  const d = dayjs(`${year}-${String(month).padStart(2, '0')}-01`);
  return {
    firstDay: d.format('YYYY-MM-DD'),
    lastDay: d.endOf('month').format('YYYY-MM-DD'),
  };
}

/**
 * Format a date to Indian standard (DD/MM/YYYY).
 * @param {string|Date} date 
 * @returns {string}
 */
function formatIndianDate(date) {
  return dayjs(date).format('DD/MM/YYYY');
}

/**
 * Get today's date as ISO string.
 * @returns {string}
 */
function today() {
  return dayjs().format('YYYY-MM-DD');
}

module.exports = {
  dayjs,
  daysInMonth,
  calculateProRata,
  calculateNextDate,
  getIndianFinancialYear,
  getWorkingDays,
  yearsOfService,
  monthsOfService,
  isInMonth,
  getMonthBounds,
  formatIndianDate,
  today,
};
