/**
 * ============================================
 *  getBestMatch Function
 *  Map geolocator function
 * ============================================
 * 
 * PURPOSE:
 * - Gets the best match for the provided address
 * - Returns the best match for the provided address
 * 
 * ============================================
 */
export function getBestMatch(data, originalQuery) {
  if (!data || data.length === 0) return null;

  data.sort((a, b) => (b.importance || 0) - (a.importance || 0));

  const firstWord = originalQuery.split(/[\s,]+/)[0].trim() || '';

  if (firstWord.length >= 2) {
    const cityMatch = data.find(item => {
      const addr = item.address || {};
      const cityVariants = [addr.city, addr.town, addr.municipality, addr.village, addr.suburb].filter(Boolean);
      return cityVariants.some(v => v.includes(firstWord));
    });
    if (cityMatch) return cityMatch;
  }

  return data[0];
}
