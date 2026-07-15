/**
 * src/services/utils/decimalMath.js
 * 
 * Centralized decimal math wrappers for all financial calculations.
 * Every module that touches money MUST use these functions instead of
 * raw floating-point arithmetic.
 * 
 * Uses decimal.js (already in package.json) for arbitrary-precision math.
 */

const Decimal = require('decimal.js');

// Configure decimal.js for financial calculations
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

/**
 * Create a Decimal from any numeric input. Safely handles null/undefined.
 * @param {number|string|Decimal} value 
 * @returns {Decimal}
 */
function toDecimal(value) {
  if (value === null || value === undefined || value === '') return new Decimal(0);
  return new Decimal(value);
}

/**
 * Add two or more values with decimal precision.
 * @param  {...(number|string)} values 
 * @returns {string} Result as fixed-2 string
 */
function add(...values) {
  return values.reduce((sum, v) => toDecimal(sum).plus(toDecimal(v)), new Decimal(0)).toFixed(2);
}

/**
 * Subtract b from a.
 * @param {number|string} a 
 * @param {number|string} b 
 * @returns {string}
 */
function subtract(a, b) {
  return toDecimal(a).minus(toDecimal(b)).toFixed(2);
}

/**
 * Multiply two values.
 * @param {number|string} a 
 * @param {number|string} b 
 * @returns {string}
 */
function multiply(a, b) {
  return toDecimal(a).times(toDecimal(b)).toFixed(2);
}

/**
 * Divide a by b. Returns "0.00" if b is zero.
 * @param {number|string} a 
 * @param {number|string} b 
 * @returns {string}
 */
function divide(a, b) {
  const divisor = toDecimal(b);
  if (divisor.isZero()) return '0.00';
  return toDecimal(a).dividedBy(divisor).toFixed(2);
}

/**
 * Calculate percentage: (value * rate / 100).
 * @param {number|string} value - Base amount
 * @param {number|string} rate - Percentage rate (e.g. 18 for 18%)
 * @returns {string}
 */
function percentage(value, rate) {
  return toDecimal(value).times(toDecimal(rate)).dividedBy(100).toFixed(2);
}

/**
 * Return the minimum of two values.
 * @param {number|string} a 
 * @param {number|string} b 
 * @returns {string}
 */
function min(a, b) {
  return Decimal.min(toDecimal(a), toDecimal(b)).toFixed(2);
}

/**
 * Return the maximum of two values.
 * @param {number|string} a 
 * @param {number|string} b 
 * @returns {string}
 */
function max(a, b) {
  return Decimal.max(toDecimal(a), toDecimal(b)).toFixed(2);
}

/**
 * Round a value to N decimal places (default 2).
 * @param {number|string} value 
 * @param {number} places 
 * @returns {string}
 */
function round(value, places = 2) {
  return toDecimal(value).toFixed(places);
}

/**
 * Check if value is positive (> 0).
 * @param {number|string} value 
 * @returns {boolean}
 */
function isPositive(value) {
  return toDecimal(value).greaterThan(0);
}

/**
 * Check if value is zero.
 * @param {number|string} value 
 * @returns {boolean}
 */
function isZero(value) {
  return toDecimal(value).isZero();
}

/**
 * Sum an array of values.
 * @param {Array<number|string>} values 
 * @returns {string}
 */
function sum(values) {
  return values.reduce((total, v) => toDecimal(total).plus(toDecimal(v)), new Decimal(0)).toFixed(2);
}

module.exports = {
  Decimal,
  toDecimal,
  add,
  subtract,
  multiply,
  divide,
  percentage,
  min,
  max,
  round,
  isPositive,
  isZero,
  sum,
};
