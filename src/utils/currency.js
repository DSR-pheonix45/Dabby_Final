export const formatCurrency = (amount, country = 'USA') => {
  const c = country ? String(country).toLowerCase() : '';
  let currencyCode = 'USD';
  
  if (c.includes('india')) currencyCode = 'INR';
  else if (c.includes('uk') || c.includes('united kingdom')) currencyCode = 'GBP';
  else if (c.includes('europe') || c.includes('germany') || c.includes('france')) currencyCode = 'EUR';
  
  try {
    return new Intl.NumberFormat('en-IN', { // using en-IN so INR is formatted like Indian numbering system (e.g., 1,00,000)
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount || 0);
  } catch (e) {
    // Fallback if Intl fails
    const sym = currencyCode === 'INR' ? '₹' : (currencyCode === 'GBP' ? '£' : (currencyCode === 'EUR' ? '€' : '$'));
    return `${sym}${(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
};
