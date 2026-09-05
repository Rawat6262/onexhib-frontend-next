import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center space-y-3">
        <h1 className="text-3xl font-semibold">404</h1>
        <p className="text-gray-500 dark:text-gray-400">This page doesn&apos;t exist.</p>
        <Link href="/" className="inline-block text-blue-600 dark:text-blue-400 hover:underline">
          Go home
        </Link>
      </div>
    </main>
  );
}
