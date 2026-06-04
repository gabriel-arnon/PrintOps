import { useEffect, useMemo, useState } from "react";

import { SEVERITY_HEX, type OpEvent } from "@/lib/system-health/telemetry";
import { formatAbsoluteTime } from "@/lib/time";
import type { EventCategory } from "@/lib/api";

function formatStamp(d: Date) {
  return formatAbsoluteTime(d);
}

interface AcknowledgeMutation {
  mutate: (eventId: number) => void;
}

const CATEGORY_STYLES: Record<EventCategory, { label: string; className: string }> = {
  INCIDENT: {
    label: "Incident",
    className: "border-[#FF5C5C33] bg-[#FF5C5C11] text-[#FF8A8A]",
  },
  OPERATIONAL: {
    label: "Ops",
    className: "border-[#5B8CFF33] bg-[#5B8CFF11] text-[#8EAFFF]",
  },
  USER: {
    label: "User",
    className: "border-[#3DDC9733] bg-[#3DDC9711] text-[#3DDC97]",
  },
};

const EVENTS_PER_PAGE = 10;
const MAX_VISIBLE_PAGES = 6;

function getVisiblePages(currentPage: number, totalPages: number) {
  if (totalPages <= MAX_VISIBLE_PAGES) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const maxStart = totalPages - MAX_VISIBLE_PAGES + 1;
  const start = Math.max(1, Math.min(currentPage - 2, maxStart));

  return Array.from({ length: MAX_VISIBLE_PAGES }, (_, index) => start + index);
}

export function EventTimeline({
  events,
  acknowledgeMutation,
}: {
  events: OpEvent[];
  acknowledgeMutation: AcknowledgeMutation;
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(events.length / EVENTS_PER_PAGE));
  const hasPagination = events.length > EVENTS_PER_PAGE;

  useEffect(() => {
    setCurrentPage((page) => Math.min(Math.max(page, 1), totalPages));
  }, [totalPages]);

  const pageEvents = useMemo(() => {
    const start = (currentPage - 1) * EVENTS_PER_PAGE;

    return events.slice(start, start + EVENTS_PER_PAGE);
  }, [currentPage, events]);

  const visiblePages = useMemo(
    () => getVisiblePages(currentPage, totalPages),
    [currentPage, totalPages],
  );

  const goToPage = (page: number) => {
    setCurrentPage(Math.min(Math.max(page, 1), totalPages));
  };

  const paginationButtonClass =
    "h-7 min-w-7 rounded-sm border border-[#2A3142] bg-[#151922] px-2 font-mono text-[11px] tabular-nums text-[#7A8194] transition-colors hover:border-[#5B8CFF] hover:text-[#8EAFFF] disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:border-[#2A3142] disabled:hover:text-[#7A8194]";

  return (
    <section className="flex h-full min-h-0 flex-col border border-[#1F2330] bg-[#11131A]">
      <header className="flex items-center justify-between border-b border-[#1F2330] px-4 py-2.5">
        <span className="text-[11px] uppercase tracking-[0.14em] text-[#7A8194]">
          Event Timeline
        </span>
        <span className="flex items-center gap-1.5 font-mono text-[11px] tabular-nums text-[#525a6e]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#3DDC97]" />
          backend events
        </span>
      </header>
      <ul
        className={`flex-1 divide-y divide-[#1F2330]/60 overflow-y-auto ${hasPagination ? "min-h-[410px]" : ""}`}
      >
        {pageEvents.map((ev) => {
          const color = SEVERITY_HEX[ev.severity];
          const categoryStyle = CATEGORY_STYLES[ev.category];
          const canAcknowledge = Number(ev.id) > 0;
          return (
            <li
              key={ev.id}
              className={` group relative grid grid-cols-[3px_68px_88px_120px_112px_1fr_56px_72px] items-center gap-3 px-4 py-2 transition-opacity hover:bg-[#0e1017] ${ev.acknowledged ? "opacity-45" : ""} `}
            >
              <span className="h-full" style={{ background: color }} />
              <span className="font-mono text-[11px] tabular-nums text-[#7A8194]">
                {formatStamp(ev.ts)}
              </span>
              <span
                className={`justify-self-start rounded-sm border px-1.5 py-[1px] font-mono text-[10px] uppercase tracking-wider ${categoryStyle.className}`}
              >
                {categoryStyle.label}
              </span>
              <span className="font-mono text-[11px] text-[#525a6e]">[{ev.component}]</span>
              <span className="truncate rounded-sm border border-[#2A3142] bg-[#151922] px-1.5 py-[1px] font-mono text-[10px] uppercase tracking-wider text-[#7A8194]">
                {ev.groupLabel}
              </span>
              <span className="truncate text-[12px] text-[#E6E8EE]">{ev.message}</span>
              <span
                className="justify-self-end rounded-sm border px-1.5 py-[1px] font-mono text-[10px] uppercase tracking-wider"
                style={{
                  color,
                  borderColor: `${color}33`,
                  background: `${color}11`,
                }}
              >
                {ev.severity}
              </span>
              {ev.acknowledged ? (
                <span
                  className="
                    justify-self-end
                    rounded-sm
                    border
                    border-[#3DDC9733]
                    bg-[#3DDC9711]
                    px-2
                    py-[2px]
                    font-mono
                    text-[10px]
                    uppercase
                    tracking-wider
                    text-[#3DDC97]
                  "
                >
                  ACKED
                </span>
              ) : canAcknowledge ? (
                <button
                  onClick={() => {
                    console.log("ACK CLICK", ev.id);

                    acknowledgeMutation.mutate(Number(ev.id));
                  }}
                  className="
                    justify-self-end
                    rounded-sm
                    border
                    border-[#2A3142]
                    bg-[#151922]
                    px-2
                    py-[2px]
                    font-mono
                    text-[10px]
                    uppercase
                    tracking-wider
                    text-[#7A8194]
                    transition-colors
                    hover:border-[#3DDC97]
                    hover:text-[#3DDC97]
                  "
                >
                  Ack
                </button>
              ) : (
                <span className="justify-self-end rounded-sm border border-[#5B8CFF33] bg-[#5B8CFF11] px-2 py-[2px] font-mono text-[10px] uppercase tracking-wider text-[#8EAFFF]">
                  Live
                </span>
              )}
            </li>
          );
        })}
      </ul>
      {hasPagination ? (
        <footer className="flex items-center justify-between gap-3 border-t border-[#1F2330] px-4 py-2">
          <span className="font-mono text-[11px] tabular-nums text-[#525a6e]">
            page {currentPage} / {totalPages}
          </span>
          <nav aria-label="Event timeline pagination" className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Go to first event page"
              disabled={currentPage === 1}
              onClick={() => goToPage(1)}
              className={paginationButtonClass}
            >
              {"<<"}
            </button>
            <button
              type="button"
              aria-label="Go to previous event page"
              disabled={currentPage === 1}
              onClick={() => goToPage(currentPage - 1)}
              className={paginationButtonClass}
            >
              {"<"}
            </button>
            {visiblePages.map((page) => {
              const isActive = page === currentPage;

              return (
                <button
                  key={page}
                  type="button"
                  aria-label={`Go to event page ${page}`}
                  aria-current={isActive ? "page" : undefined}
                  onClick={() => goToPage(page)}
                  className={
                    isActive
                      ? "h-7 min-w-7 rounded-sm border border-[#5B8CFF] bg-[#5B8CFF22] px-2 font-mono text-[11px] tabular-nums text-[#E6E8EE]"
                      : paginationButtonClass
                  }
                >
                  {page}
                </button>
              );
            })}
            <button
              type="button"
              aria-label="Go to next event page"
              disabled={currentPage === totalPages}
              onClick={() => goToPage(currentPage + 1)}
              className={paginationButtonClass}
            >
              {">"}
            </button>
            <button
              type="button"
              aria-label="Go to last event page"
              disabled={currentPage === totalPages}
              onClick={() => goToPage(totalPages)}
              className={paginationButtonClass}
            >
              {">>"}
            </button>
          </nav>
        </footer>
      ) : null}
    </section>
  );
}
