import { AlertTriangle, Clock } from "lucide-react";

function formatDuration(sec: number) {

  const h = Math.floor(sec / 3600);

  const m = Math.floor((sec % 3600) / 60);

  const s = sec % 60;

  if (h > 0) {

    return `${h}h ${m}m`;

  }

  if (m > 0) {

    return `${m}m ${s}s`;

  }

  return `${s}s`;

}

interface ActiveIncident {

  printer_id: number;

  printer: string;

  severity: string;

  acknowledged: boolean;

  offline_since: string;

  duration_sec: number;

}

export function ActiveIncidents({

  incidents,

}: {

  incidents: ActiveIncident[];

}) {

  return (

    <section className="border border-[#1F2330] bg-[#11131A]">

      <header className="flex items-center justify-between border-b border-[#1F2330] px-4 py-3">

        <div className="flex items-center gap-2">

          <AlertTriangle className="h-4 w-4 text-[#FF5D73]" />

          <span className="text-[11px] uppercase tracking-[0.14em] text-[#7A8194]">

            Active Incidents

          </span>

        </div>

        <span className="font-mono text-[11px] text-[#525a6e]">

          {incidents.length} active

        </span>

      </header>

      {incidents.length === 0 ? (

        <div className="flex items-center justify-center px-6 py-10 text-sm text-[#7A8194]">

          No active incidents

        </div>

      ) : (

        <div className="divide-y divide-[#1F2330]/60">

          {incidents.map((incident) => (

            <div
              key={incident.printer_id}
              className={`
                flex items-center gap-4 px-4 py-3
                ${incident.acknowledged ? "opacity-60" : ""}
              `}
            >

              <div className="h-2 w-2 rounded-full bg-[#FF5D73]" />

              <div className="min-w-0 flex-1">

                <div className="truncate text-sm text-[#E6E8EE]">

                  {incident.printer}

                </div>

                <div className="mt-1 flex items-center gap-2 text-[11px] text-[#7A8194]">

                  <Clock className="h-3 w-3" />

                  offline for {formatDuration(incident.duration_sec)}

                </div>

              </div>

              {incident.acknowledged ? (

                <span className="rounded border border-[#3DDC9733] bg-[#3DDC9711] px-1.5 py-[2px] text-[10px] font-mono uppercase tracking-wider text-[#3DDC97]">

                  ACKED

                </span>

              ) : (

                <span className="rounded border border-[#FF5D7333] bg-[#FF5D7311] px-1.5 py-[2px] text-[10px] font-mono uppercase tracking-wider text-[#FF5D73]">

                  ACTIVE

                </span>

              )}

            </div>

          ))}

        </div>

      )}

    </section>

  );

}
