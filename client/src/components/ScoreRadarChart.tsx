import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts'

export default function ScoreRadarChart({
  scores,
  labels,
}: {
  scores: Record<string, number>
  labels: Record<string, string>
}) {
  const data = Object.entries(scores).map(([key, value]) => ({
    key: labels[key] || key,
    value,
  }))

  return (
    <ResponsiveContainer width="100%" height={220}>
      <RadarChart data={data}>
        <defs>
          <radialGradient id="radarFill" cx="50%" cy="50%" r="70%">
            <stop offset="0%" stopColor="var(--gradient-from)" stopOpacity={0.5} />
            <stop offset="100%" stopColor="var(--gradient-to)" stopOpacity={0.15} />
          </radialGradient>
        </defs>
        <PolarGrid stroke="var(--border)" />
        <PolarAngleAxis dataKey="key" tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} />
        <PolarRadiusAxis domain={[0, 9]} tick={false} axisLine={false} />
        <Radar dataKey="value" stroke="var(--gradient-to)" strokeWidth={2} fill="url(#radarFill)" />
      </RadarChart>
    </ResponsiveContainer>
  )
}
