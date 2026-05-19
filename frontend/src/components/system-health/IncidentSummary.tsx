interface IncidentSummaryProps {

  summary: {

    active: number;

    unacknowledged: number;

    critical: number;

    recoveries_24h: number;

  };

}

function MetricCard({

  label,

  value,

  color,

}: {

  label: string;

  value: number;

  color: string;

}) {

  return (

    <div className="border border-[#1F2330] bg-[#11131A] p-4">

      <div className="text-[11px] uppercase tracking-[0.14em] text-[#7A8194]">

        {label}

      </div>

      <div
        className="mt-2 font-mono text-3xl font-semibold"
        style={{ color }}
      >
        {value}
      </div>

    </div>

  );

}

export function IncidentSummary({

  summary,

}: IncidentSummaryProps) {

  return (

    <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">

      <MetricCard
        label="Active Incidents"
        value={summary.active}
        color="#FF5D73"
      />

      <MetricCard
        label="Unacknowledged"
        value={summary.unacknowledged}
        color="#FFB84D"
      />

      <MetricCard
        label="Critical"
        value={summary.critical}
        color="#FF3B3B"
      />

      <MetricCard
        label="Recoveries"
        value={summary.recoveries_24h}
        color="#3DDC97"
      />

    </section>

  );

}
 
