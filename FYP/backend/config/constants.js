/** Maximum catalog / student progression semester (supports extended programs). */
const MAX_SEMESTER = 12;

const SEMESTER_NUMBERS = Array.from({ length: MAX_SEMESTER }, (_, i) => i + 1);

module.exports = {
  MAX_SEMESTER,
  SEMESTER_NUMBERS
};
