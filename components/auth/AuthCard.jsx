import Image from "next/image";
import ThemeToggle from "@/components/layout/ThemeToggle";

/**
 * Shared shell for the auth screens. Every Vite auth view repeated this exact
 * gradient wrapper, logo block and ThemeToggle; the classes are carried over
 * unchanged so the pages look identical.
 */
export default function AuthCard({ children, wide = false, formProps }) {
  return (
    <div className="relative flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-100 via-white to-purple-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 p-6">
      <ThemeToggle className="absolute top-4 right-4 text-gray-500 dark:text-gray-400" />
      <form
        {...formProps}
        className={`w-full ${wide ? "max-w-4xl p-4 sm:p-8 rounded-2xl sm:rounded-3xl space-y-6 sm:space-y-8" : "max-w-md p-5 sm:p-8 rounded-2xl space-y-6 sm:space-y-8"} bg-white dark:bg-gray-900 shadow-2xl border border-gray-200 dark:border-gray-800`}
        style={wide ? undefined : { boxShadow: "0 4px 48px 0 rgba(60,60,120,0.10)" }}
      >
        <div className="flex justify-center items-center">
          <Image src="/Dark.png" alt="OneXhib" width={180} height={54} priority className="w-40 h-auto object-contain" />
        </div>
        {children}
      </form>
    </div>
  );
}
