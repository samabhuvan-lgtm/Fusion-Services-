/**
 * High-Precision Financial Math Engine
 * All calculations are done in integer Paise (1 Rupee = 100 Paise)
 * to avoid floating-point representation errors.
 */

// Convert Rupees (decimal/string) to integer Paise
export function rupeesToPaise(rupees) {
  if (rupees === null || rupees === undefined || rupees === '') return 0;
  const num = typeof rupees === 'string' ? parseFloat(rupees) : rupees;
  if (isNaN(num)) return 0;
  return Math.round(num * 100);
}

// Convert integer Paise back to Rupees decimal string (2 decimal places)
export function paiseToRupees(paise) {
  if (paise === null || paise === undefined) return '0.00';
  return (paise / 100).toFixed(2);
}

// Format integer Paise to Indian currency format (e.g., ₹1,50,000.00)
export function formatCurrency(paise, includeSymbol = true) {
  if (paise === null || paise === undefined || isNaN(paise)) paise = 0;
  const rupees = paise / 100;
  const formatter = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${includeSymbol ? '₹' : ''}${formatter.format(rupees)}`;
}

// Calculate subtotal for a single BOM line item
export function calculateLineSubtotal(quantity, unitPricePaise) {
  const q = parseFloat(quantity);
  const p = parseInt(unitPricePaise, 10);
  if (isNaN(q) || isNaN(p) || q <= 0 || p <= 0) return 0;
  return Math.round(q * p);
}

// Calculate discount amount in paise
export function calculateDiscountAmount(subtotalPaise, discountType, discountValue) {
  const val = parseFloat(discountValue);
  if (isNaN(val) || val <= 0) return 0;

  if (discountType === 'percentage') {
    // Round to nearest paise
    return Math.round(subtotalPaise * (val / 100));
  } else if (discountType === 'flat') {
    // Convert flat value in rupees to paise
    const flatPaise = rupeesToPaise(val);
    return Math.min(flatPaise, subtotalPaise);
  }
  return 0;
}

// Helper to convert numbers to Indian Rupees in words
export function numberToWords(amountPaise) {
  const amountRupees = Math.floor(amountPaise / 100);
  if (amountRupees === 0) return 'Zero Rupees Only';

  const singleDigits = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const doubleDigits = ['', 'Ten', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const teenDigits = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

  function convertLessThanOneThousand(number) {
    let word = '';
    if (number >= 100) {
      word += singleDigits[Math.floor(number / 100)] + ' Hundred ';
      number %= 100;
    }
    if (number >= 20) {
      word += doubleDigits[Math.floor(number / 10)] + ' ';
      number %= 10;
    } else if (number >= 10) {
      word += teenDigits[number - 10] + ' ';
      number = 0;
    }
    if (number > 0) {
      word += singleDigits[number] + ' ';
    }
    return word;
  }

  let number = amountRupees;
  let word = '';

  const crores = Math.floor(number / 10000000);
  number %= 10000000;
  if (crores > 0) {
    word += convertLessThanOneThousand(crores) + 'Crore ';
  }

  const lakhs = Math.floor(number / 100000);
  number %= 100000;
  if (lakhs > 0) {
    word += convertLessThanOneThousand(lakhs) + 'Lakh ';
  }

  const thousands = Math.floor(number / 1000);
  number %= 1000;
  if (thousands > 0) {
    word += convertLessThanOneThousand(thousands) + 'Thousand ';
  }

  if (number > 0) {
    word += convertLessThanOneThousand(number);
  }

  // Handle paise remainder for full precision details
  const paiseRemainder = Math.round(amountPaise % 100);
  let paiseWord = '';
  if (paiseRemainder > 0) {
    let pNum = paiseRemainder;
    let pWord = '';
    if (pNum >= 20) {
      pWord += doubleDigits[Math.floor(pNum / 10)] + ' ';
      pNum %= 10;
    } else if (pNum >= 10) {
      pWord += teenDigits[pNum - 10] + ' ';
      pNum = 0;
    }
    if (pNum > 0) {
      pWord += singleDigits[pNum] + ' ';
    }
    paiseWord = ` and ${pWord.trim()} Paise`;
  }

  return `${word.trim()} Rupees${paiseWord} Only`;
}
