import Link from "next/link";

/**
 * Required by @next/mdx: maps Markdown elements onto the site's type scale.
 *
 * Post bodies are plain Markdown, so an author never writes a className. The
 * styling here mirrors ProseSection so a blog post and a prose page read as
 * the same publication rather than two different sites.
 *
 * Internal links become <Link> so in-app navigation stays client-side; external
 * ones keep a plain <a> and gain rel="noopener" since they open in a new tab.
 */
export function useMDXComponents(components) {
  return {
    h2: (props) => (
      <h2
        className="mt-10 scroll-mt-24 text-xl font-bold tracking-tight text-gray-900 dark:text-gray-50"
        {...props}
      />
    ),
    h3: (props) => (
      <h3
        className="mt-8 scroll-mt-24 text-[17px] font-semibold text-gray-900 dark:text-gray-100"
        {...props}
      />
    ),
    p: (props) => (
      <p className="mt-3 text-[15px] leading-relaxed text-gray-600 dark:text-gray-400" {...props} />
    ),
    ul: (props) => (
      <ul
        className="mt-3 list-disc space-y-1 pl-5 text-[15px] leading-relaxed text-gray-600 dark:text-gray-400"
        {...props}
      />
    ),
    ol: (props) => (
      <ol
        className="mt-3 list-decimal space-y-1 pl-5 text-[15px] leading-relaxed text-gray-600 dark:text-gray-400"
        {...props}
      />
    ),
    strong: (props) => (
      <strong className="font-semibold text-gray-900 dark:text-gray-100" {...props} />
    ),
    blockquote: (props) => (
      <blockquote
        className="mt-4 border-l-2 border-gray-200 pl-4 text-[15px] italic text-gray-500 dark:border-gray-800 dark:text-gray-400"
        {...props}
      />
    ),
    table: (props) => (
      // Wide tables must scroll inside their own box rather than pushing the
      // page sideways on a phone.
      <div className="mt-4 overflow-x-auto">
        <table className="w-full border-collapse text-left text-[14px]" {...props} />
      </div>
    ),
    th: (props) => (
      <th
        className="border-b border-gray-200 px-3 py-2 font-semibold text-gray-900 dark:border-gray-800 dark:text-gray-100"
        {...props}
      />
    ),
    td: (props) => (
      <td
        className="border-b border-gray-100 px-3 py-2 text-gray-600 dark:border-gray-900 dark:text-gray-400"
        {...props}
      />
    ),
    hr: () => <hr className="my-10 border-gray-200 dark:border-gray-800" />,
    a: ({ href = "", children, ...rest }) => {
      const cls =
        "font-semibold text-[#131C55] underline-offset-4 hover:underline dark:text-blue-300";
      if (href.startsWith("/")) {
        return (
          <Link href={href} className={cls} {...rest}>
            {children}
          </Link>
        );
      }
      return (
        <a href={href} className={cls} target="_blank" rel="noopener noreferrer" {...rest}>
          {children}
        </a>
      );
    },
    ...components,
  };
}
