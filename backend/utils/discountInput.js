/**
 * Normalisation for discount input coming off the admin form.
 *
 * Kept apart from utils/pricing.js: that file decides what a customer pays and
 * must stay pure arithmetic, while this one only cleans up what an admin typed
 * before it reaches the database.
 */

const idOf = (v) => String(v && v._id ? v._id : v);

/**
 * Keep hand-priced products consistent with the selection they belong to.
 *
 * Drops entries for products that are no longer selected — unselecting a
 * product must not leave a stale price behind that quietly resurfaces if it is
 * ever picked again — rejects prices that aren't a usable number, and keeps a
 * single entry per product so a duplicated id can never make the sale price
 * ambiguous.
 *
 * @param {Array<{product: any, price: any}>} productPrices raw entries
 * @param {Array<any>} products the selected product ids (or populated docs)
 * @returns {Array<{product: string, price: number}>}
 */
function sanitizeProductPrices(productPrices, products) {
  if (!Array.isArray(productPrices)) return [];
  const selected = new Set((products || []).map(idOf));
  const byProduct = new Map();
  for (const entry of productPrices) {
    if (!entry) continue;
    const id = idOf(entry.product);
    if (!id || id === 'undefined' || id === 'null' || !selected.has(id)) continue;
    // Coerce narrowly: Number(null), Number('') and Number([]) are all 0, so a
    // blank or missing price would otherwise be stored as "this product is
    // free" rather than "this product has no hand-set price".
    const raw = entry.price;
    if (typeof raw !== 'number' && typeof raw !== 'string') continue;
    if (typeof raw === 'string' && raw.trim() === '') continue;
    const price = Number(raw);
    if (!Number.isFinite(price) || price < 0) continue;
    byProduct.set(id, { product: id, price: Math.round(price) });
  }
  return [...byProduct.values()];
}

module.exports = { sanitizeProductPrices };
