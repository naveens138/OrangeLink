/**
 * Shown the instant a dashboard tab is tapped, while the page's data loads.
 * Without it the old page just sat there until the server answered, which
 * on a phone read as the tap not registering. Shaped like a typical page:
 * title, a line of copy, then cards.
 */
export default function DashboardLoading() {
  const bar = "animate-pulse rounded-sm bg-surface-2";

  return (
    <div aria-busy="true" aria-label="Loading" className="flex flex-col gap-8">
      <div className="flex flex-col gap-2.5">
        <div className={`${bar} h-5 w-40`} />
        <div className={`${bar} h-3.5 w-72 max-w-full`} />
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-md border border-border bg-surface-1 p-5">
            <div className={`${bar} h-2.5 w-16`} />
            <div className={`${bar} mt-3 h-5 w-12`} />
          </div>
        ))}
      </div>
      <div className="rounded-md border border-border bg-surface-1 p-5">
        <div className={`${bar} h-3.5 w-28`} />
        <div className="mt-4 flex flex-col gap-2.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className={`${bar} h-10 w-full`} />
          ))}
        </div>
      </div>
    </div>
  );
}
