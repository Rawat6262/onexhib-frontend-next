/**
 * Horizontal discovery rail.
 *
 * A plain overflow container with CSS scroll-snap — no carousel library, no
 * JavaScript, no hydration. Native scrolling means touch momentum, trackpad
 * gestures, keyboard arrows and Shift+wheel all work for free, and every card
 * stays in the DOM so a crawler reads the whole rail.
 *
 * On large screens it becomes a grid instead, because a rail that fits entirely
 * on screen just looks like a broken grid.
 */
export default function Rail({ children, className = "" }) {
  return (
    <ul
      className={`ox-rail -mx-4 flex snap-x snap-mandatory list-none gap-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-4 lg:overflow-visible lg:px-0 ${className}`}
    >
      {children}
    </ul>
  );
}

/** One rail item. Fixed width while scrolling, fluid once the rail becomes a grid. */
export function RailItem({ children }) {
  return (
    <li className="w-[78vw] max-w-[300px] shrink-0 snap-start sm:w-[46vw] lg:w-auto lg:max-w-none">
      {children}
    </li>
  );
}
