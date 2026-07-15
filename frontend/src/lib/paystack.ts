// Backward-compat re-export. The payment gateway is now Korapay.
// Prefer importing from '@/lib/korapay' directly.
export {
  useKorapay as usePaystack,
  useShippingInfo,
  getDeliveryCost,
  calculateTotals,
} from './korapay';
export type { KorapayReference as PaystackReference } from './korapay';
