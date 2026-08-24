import { BUSINESS } from '@/lib/seo';
import { WhatsAppIcon } from '@/components/ui/WhatsAppIcon';

const WHATSAPP_URL = `https://wa.me/${BUSINESS.whatsapp}?text=${encodeURIComponent(
  "Hello Kentaz Emporium! I'd like to make an enquiry."
)}`;

export function WhatsAppFloat() {
  return (
    <a
      href={WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with Kentaz Emporium on WhatsApp"
      className="group fixed z-30 flex items-center right-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] sm:right-6 sm:bottom-[calc(1.5rem+env(safe-area-inset-bottom))] focus-visible:outline-none"
    >
      <span
        className="pointer-events-none absolute right-full top-1/2 mr-3 hidden -translate-y-1/2 translate-x-2 items-center whitespace-nowrap rounded-full border border-black/5 bg-white px-4 py-2 text-sm font-medium text-[#1A1A1A] opacity-0 shadow-lg transition-all duration-300 ease-out group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100 sm:flex"
        aria-hidden="true"
      >
        Chat with us
        <span className="absolute right-[-4px] top-1/2 h-2 w-2 -translate-y-1/2 rotate-45 bg-white" />
      </span>

      <span className="relative inline-flex">
        <span className="absolute inset-0 rounded-full bg-[#25D366] opacity-40 motion-safe:animate-ping" />
        <span className="relative flex h-12 w-12 items-center justify-center rounded-full bg-[#25D366] text-white shadow-xl shadow-[#25D366]/30 ring-offset-2 transition-all duration-300 group-hover:scale-110 group-hover:bg-[#1FBF59] group-focus-visible:ring-4 group-focus-visible:ring-[#25D366]/40 sm:h-14 sm:w-14">
          <WhatsAppIcon className="h-6 w-6 sm:h-7 sm:w-7" />
        </span>
      </span>
    </a>
  );
}
