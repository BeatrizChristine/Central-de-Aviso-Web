import { Activity, ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { MAX_ACTIVITY_SAMPLES } from "./monitor-utils";
import type { ActivitySample } from "./types";

export function ActivityChart({ samples }: { samples: ActivitySample[] }) {
  const recent = samples.slice(-MAX_ACTIVITY_SAMPLES);
  const last = recent.at(-1);
  const previous = recent.at(-2);
  const difference = last && previous ? last.online - previous.online : 0;

  if (recent.length < 2) {
    return (
      <section className="activity-chart-card">
        <ChartHeading difference={difference} />
        <div className="chart-awaiting"><Activity size={28} /><strong>Coletando atividade</strong><span>A próxima leitura formará a linha do gráfico.</span></div>
      </section>
    );
  }

  const width = 900;
  const height = 230;
  const left = 42;
  const right = 20;
  const top = 16;
  const bottom = 34;
  const chartWidth = width - left - right;
  const chartHeight = height - top - bottom;
  const maximum = Math.max(5, ...recent.map((sample) => sample.online));
  const yMaximum = Math.ceil((maximum + 2) / 5) * 5;
  const coordinates = recent.map((sample, index) => ({
    ...sample,
    x: left + (index / (recent.length - 1)) * chartWidth,
    y: top + (1 - sample.online / yMaximum) * chartHeight,
  }));
  const points = coordinates.map((point) => `${point.x},${point.y}`).join(" ");
  const area = `M ${left} ${top + chartHeight} L ${coordinates.map((point) => `${point.x} ${point.y}`).join(" L ")} L ${left + chartWidth} ${top + chartHeight} Z`;
  const labels = [coordinates[0], coordinates[Math.floor((coordinates.length - 1) / 2)], coordinates.at(-1)!];

  return (
    <section className="activity-chart-card">
      <ChartHeading difference={difference} />
      <div className="activity-chart-wrap">
        <svg className="activity-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Gráfico de dispositivos online ao longo do tempo">
          <defs>
            <linearGradient id="activity-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0F897A" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#0F897A" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          {[0, 1, 2, 3, 4].map((line) => {
            const y = top + (line / 4) * chartHeight;
            const value = Math.round(yMaximum * (1 - line / 4));
            return <g key={line}><line x1={left} x2={left + chartWidth} y1={y} y2={y} className="chart-grid-line" /><text x={left - 10} y={y + 3} className="chart-axis-value">{value}</text></g>;
          })}
          <path d={area} fill="url(#activity-area)" />
          <polyline points={points} className="chart-line" />
          {coordinates.map((point) => <circle key={point.timestamp} cx={point.x} cy={point.y} r="4" className="chart-point"><title>{formatChartTime(point.timestamp)} — {point.online} online</title></circle>)}
          {labels.map((point, index) => <text key={`${point.timestamp}-${index}`} x={point.x} y={height - 8} className="chart-time-label" textAnchor={index === 0 ? "start" : index === 2 ? "end" : "middle"}>{formatChartTime(point.timestamp)}</text>)}
        </svg>
      </div>
    </section>
  );
}

function ChartHeading({ difference }: { difference: number }) {
  const movement = difference > 0
    ? { icon: <ArrowUpRight size={15} />, text: `+${difference} desde a última leitura`, className: "movement-up" }
    : difference < 0
      ? { icon: <ArrowDownRight size={15} />, text: `${difference} desde a última leitura`, className: "movement-down" }
      : { icon: <Minus size={15} />, text: "Sem alteração na última leitura", className: "movement-stable" };

  return (
    <div className="activity-chart-heading">
      <div><span className="section-icon"><Activity size={18} /></span><p><strong>Atividade em tempo real</strong><small>Dispositivos online por leitura</small></p></div>
      <span className={`chart-movement ${movement.className}`}>{movement.icon}{movement.text}</span>
    </div>
  );
}

function formatChartTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
