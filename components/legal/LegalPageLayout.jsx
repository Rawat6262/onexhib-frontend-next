import Image from "next/image";
import ThemeToggle from "@/components/layout/ThemeToggle";

/**
 * Shared chrome for the legal pages, migrated from views/legal/LegalPageLayout.jsx.
 * Markup and classes are unchanged; the only differences are next/image for the
 * logo and the fact that this is a Server Component now — ThemeToggle is the
 * single client island inside it.
 */
export const Section = ({ title, children }) => (
  <section className="mb-8">
    <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">{title}</h2>
    <div className="space-y-3 text-sm sm:text-base text-gray-700 dark:text-gray-300 leading-relaxed">
      {children}
    </div>
  </section>
);

const LegalPageLayout = ({ title, subtitle, children, footer }) => (
  <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 relative">
      <ThemeToggle className="absolute top-8 right-4 sm:right-6 text-gray-500 dark:text-gray-400" />
      <div className="flex justify-center mb-6">
        <Image src="/Dark.png" alt="OneXhib" width={160} height={48} priority className="h-10 sm:h-12 w-auto object-contain" />
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-5 sm:p-10">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-1">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">{subtitle}</p>}

        {children}

        {footer && <div className="pt-4 border-t border-gray-200 dark:border-gray-800">{footer}</div>}
      </div>
    </div>
  </div>
);

export default LegalPageLayout;
