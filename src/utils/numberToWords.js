/**
 * Utility to convert numeric monetary amounts into Indian Numbering words format.
 * Example: 1219500 -> "Twelve lakhs nineteen thousand five hundred only."
 */

export function numberToWords(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) return "";
  const num = Math.abs(Number(amount));
  if (num === 0) return "Zero rupees only.";

  const rupees = Math.floor(num);
  const paise = Math.round((num - rupees) * 100);

  const ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
  const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

  function convertChunk(n) {
    if (n < 20) return ones[n];
    const digit = n % 10;
    return tens[Math.floor(n / 10)] + (digit ? ' ' + ones[digit] : '');
  }

  function convertRupees(n) {
    if (n === 0) return '';
    let str = '';

    const crores = Math.floor(n / 10000000);
    n %= 10000000;
    const lakhs = Math.floor(n / 100000);
    n %= 100000;
    const thousands = Math.floor(n / 1000);
    n %= 1000;
    const hundreds = Math.floor(n / 100);
    n %= 100;

    if (crores > 0) str += convertChunk(crores) + ' crore' + (crores > 1 ? 's' : '') + ' ';
    if (lakhs > 0) str += convertChunk(lakhs) + ' lakh' + (lakhs > 1 ? 's' : '') + ' ';
    if (thousands > 0) str += convertChunk(thousands) + ' thousand ';
    if (hundreds > 0) str += convertChunk(hundreds) + ' hundred ';
    if (n > 0) {
      if (str !== '') str += 'and ';
      str += convertChunk(n);
    }
    return str.trim();
  }

  let result = convertRupees(rupees);
  if (!result) result = 'zero';
  result = result.charAt(0).toUpperCase() + result.slice(1);

  if (paise > 0) {
    result += ' and ' + convertChunk(paise) + ' paise';
  }
  return result + ' only.';
}
