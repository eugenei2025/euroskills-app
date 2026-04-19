import { Card, CardContent } from '@/components/ui/Card'
import { cn } from '@/lib/utils'

interface MetricCardProps {
  label: string
  value: number | string
  sub?: string
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'gray'
}

const colorClasses: Record<string, string> = {
  blue:   'text-blue-600',
  green:  'text-green-600',
  yellow: 'text-yellow-600',
  red:    'text-red-600',
  gray:   'text-gray-500',
}

export function MetricCard({ label, value, sub, color = 'blue' }: MetricCardProps) {
  return (
    <Card>
      <CardContent className="py-5">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
        <p className={cn('mt-1 text-3xl font-semibold', colorClasses[color])}>{value}</p>
        {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
      </CardContent>
    </Card>
  )
}
