import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { Task1ChartContent } from '@/lib/api'

const COLORS = ['#2563eb', '#dc2626', '#16a34a', '#9333ea', '#ea580c', '#0891b2']

export default function Task1Chart({ content }: { content: Task1ChartContent }) {
  // 长单位(比如"thousand USD")直接拼在Y轴刻度上会太宽挤到坐标轴外面被裁掉——
  // 只有"%"这种短单位才拼进刻度，长单位留给题目文字描述里说明就好
  const axisUnit = content.unit && content.unit.length <= 2 ? content.unit : undefined

  if (content.chartType === 'bar') {
    return (
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={content.data} margin={{ left: 12, right: 12, top: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={content.xKey} fontSize={12} />
          <YAxis fontSize={12} unit={axisUnit} width={axisUnit ? 40 : 56} />
          <Tooltip />
          {content.seriesKeys && content.seriesKeys.length > 1 && <Legend />}
          {content.seriesKeys?.map((k, i) => <Bar key={k} dataKey={k} fill={COLORS[i % COLORS.length]} />)}
        </BarChart>
      </ResponsiveContainer>
    )
  }

  if (content.chartType === 'line') {
    return (
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={content.data} margin={{ left: 12, right: 12, top: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={content.xKey} fontSize={12} />
          <YAxis fontSize={12} unit={axisUnit} width={axisUnit ? 40 : 56} />
          <Tooltip />
          {content.seriesKeys && content.seriesKeys.length > 1 && <Legend />}
          {content.seriesKeys?.map((k, i) => (
            <Line key={k} type="monotone" dataKey={k} stroke={COLORS[i % COLORS.length]} strokeWidth={2} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    )
  }

  if (content.chartType === 'pie') {
    return (
      <div className="flex gap-4 justify-center">
        {content.pies?.map((pie, i) => (
          <div key={i} className="text-center">
            <p className="text-sm font-medium mb-1">{pie.title}</p>
            <PieChart width={220} height={220}>
              <Pie data={pie.data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={(d) => `${d.name} ${d.value}${content.unit}`}>
                {pie.data.map((_, j) => (
                  <Cell key={j} fill={COLORS[j % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </div>
        ))}
      </div>
    )
  }

  if (content.chartType === 'table' && content.columns && content.data) {
    return (
      <table className="w-full text-sm border border-border">
        <thead>
          <tr className="bg-muted/50">
            {content.columns.map((c) => (
              <th key={c} className="border border-border px-3 py-1.5 text-left">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {content.data.map((row, i) => (
            <tr key={i}>
              {content.columns!.map((c) => (
                <td key={c} className="border border-border px-3 py-1.5">
                  {row[c]}
                  {c !== content.columns![0] && content.unit ? ` ${content.unit}` : ''}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  return null
}
