import { useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ReferenceDot,
  ResponsiveContainer,
} from 'recharts'
import { calculateSSI } from '../engine/ssi-calculator.ts'
import { CURRENT_CONSTANTS } from '../engine/benefit-constants.ts'
import type { ClientProfile } from '../types/index.ts'
import { fmt } from '../utils/format.ts'

// Brand colors — keep in sync with tailwind.config.js
const NAVY  = '#1B3A5C'
const TEAL  = '#0D9488'

interface ChartPoint {
  wages: number
  ssiPayment: number
  totalIncome: number
}

interface Props {
  profile: ClientProfile
  currentWage: number
}

// ── Custom tooltip ────────────────────────────────────────────────────────────

interface TooltipEntry {
  name: string
  value: number
  color: string
  dataKey: string
}

interface TooltipProps {
  active?: boolean
  payload?: TooltipEntry[]
  label?: number
}

function ChartTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded shadow-sm px-3 py-2 text-xs space-y-0.5">
      <p className="font-semibold text-gray-600 mb-1">
        Wages: {fmt(label ?? 0)}/mo
      </p>
      {payload.map(entry => (
        <p key={entry.dataKey} style={{ color: entry.color }}>
          {entry.name}: {fmt(entry.value)}
        </p>
      ))}
    </div>
  )
}

// ── Chart ─────────────────────────────────────────────────────────────────────

const X_TICKS = [0, 500, 1000, 1500, 2000, 2500, 3000, 3500, 4000]

export function BreakevenChart({ profile, currentWage }: Props) {
  // Pre-compute SSI payment and total income at every $100 increment
  const chartData = useMemo<ChartPoint[]>(() => {
    return Array.from({ length: 41 }, (_, i) => {
      const wages = i * 100
      const r = calculateSSI(profile, wages)
      return { wages, ssiPayment: r.adjustedSSIPayment, totalIncome: r.totalFinancialOutcome }
    })
  }, [profile])

  // Find the first $100 increment where SSI payment drops to $0
  const breakEvenWage = useMemo(() => {
    for (let i = 1; i < chartData.length; i++) {
      const prev = chartData[i - 1]
      const curr = chartData[i]
      if (prev && curr && curr.ssiPayment === 0 && prev.ssiPayment > 0) {
        return curr.wages
      }
    }
    return null
  }, [chartData])

  // Right-edge label positions (last data point)
  const lastPoint = chartData[chartData.length - 1]!

  // Current-wage dot (snap to nearest $100 so it always hits a data point)
  const snappedWage = Math.round(currentWage / 100) * 100
  const dotPoint = chartData.find(d => d.wages === snappedWage) ?? null

  // FBR for the horizontal reference line
  const fbr = profile.householdType === 'ELIGIBLE_COUPLE'
    ? CURRENT_CONSTANTS.FBR_COUPLE
    : CURRENT_CONSTANTS.FBR_INDIVIDUAL

  return (
    <div className="bg-white border border-gray-200 rounded-lg px-4 pt-4 pb-3">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Break-even Analysis
        </h3>
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-4 h-0.5" style={{ background: NAVY }} />
            <span className="text-gray-500">SSI Payment</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-4 h-0.5" style={{ background: TEAL }} />
            <span className="text-gray-500">Total Income</span>
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <LineChart
          data={chartData}
          margin={{ top: 20, right: 80, bottom: 8, left: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />

          <XAxis
            dataKey="wages"
            ticks={X_TICKS}
            tickFormatter={v => `$${Number(v).toLocaleString()}`}
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
            height={24}
          />

          <YAxis
            tickFormatter={v => fmt(v as number)}
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            width={54}
            axisLine={false}
            tickLine={false}
          />

          <Tooltip content={<ChartTooltip />} />

          {/* Horizontal reference: current SSI at $0 wages (= FBR) */}
          <ReferenceLine
            y={fbr}
            stroke="#d1d5db"
            strokeDasharray="5 3"
            label={{
              value: `Current SSI (${fmt(fbr)})`,
              position: 'insideBottomRight',
              fontSize: 10,
              fill: '#9ca3af',
              dy: -4,
            }}
          />

          {/* Vertical reference: break-even point */}
          {breakEvenWage !== null && (
            <ReferenceLine
              x={breakEvenWage}
              stroke={TEAL}
              strokeDasharray="5 3"
              label={{
                value: `Break-even (${fmt(breakEvenWage)})`,
                position: 'top',
                fontSize: 10,
                fill: TEAL,
              }}
            />
          )}

          {/* SSI Payment line — tern-navy */}
          <Line
            type="monotone"
            dataKey="ssiPayment"
            name="SSI Payment"
            stroke={NAVY}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: NAVY, strokeWidth: 0 }}
          />

          {/* Total Income line — tern-teal */}
          <Line
            type="monotone"
            dataKey="totalIncome"
            name="Total Income"
            stroke={TEAL}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: TEAL, strokeWidth: 0 }}
          />

          {/* Right-edge labels via invisible ReferenceDots */}
          <ReferenceDot
            x={lastPoint.wages}
            y={lastPoint.ssiPayment}
            r={0}
            label={{ value: 'SSI', position: 'right', fontSize: 11, fill: NAVY, fontWeight: 600 }}
          />
          <ReferenceDot
            x={lastPoint.wages}
            y={lastPoint.totalIncome}
            r={0}
            label={{ value: 'Total Income', position: 'right', fontSize: 11, fill: TEAL, fontWeight: 600 }}
          />

          {/* Current-wage indicator dots */}
          {dotPoint !== null && (
            <>
              <ReferenceDot x={dotPoint.wages} y={dotPoint.ssiPayment}  r={5} fill={NAVY} stroke="white" strokeWidth={2} />
              <ReferenceDot x={dotPoint.wages} y={dotPoint.totalIncome} r={5} fill={TEAL} stroke="white" strokeWidth={2} />
            </>
          )}
        </LineChart>
      </ResponsiveContainer>

      <p className="text-xs text-gray-400 mt-1 text-center">
        Total Income keeps rising after SSI hits $0 — earnings replace the benefit dollar-for-dollar above break-even.
      </p>
    </div>
  )
}
