'use client'

interface TimingBadgeProps {
  signal: 'buy' | 'accumulate' | 'avoid' | 'watch'
  label?: string
  showDescription?: boolean
  description?: string
}

const SIGNAL_CONFIG = {
  buy: {
    icon: '🟢',
    label: '権利落ち直後（狙い目）',
    bgColor: 'bg-green-50',
    textColor: 'text-green-700',
    borderColor: 'border-green-200',
  },
  accumulate: {
    icon: '🟡',
    label: '閑散期（仕込み時）',
    bgColor: 'bg-yellow-50',
    textColor: 'text-yellow-700',
    borderColor: 'border-yellow-200',
  },
  avoid: {
    icon: '🟠',
    label: '権利確定直前（割高注意）',
    bgColor: 'bg-orange-50',
    textColor: 'text-orange-700',
    borderColor: 'border-orange-200',
  },
  watch: {
    icon: '⚪',
    label: '様子見',
    bgColor: 'bg-gray-50',
    textColor: 'text-gray-600',
    borderColor: 'border-gray-200',
  },
}

export default function TimingBadge({ signal, label, showDescription, description }: TimingBadgeProps) {
  const config = SIGNAL_CONFIG[signal]

  return (
    <div className={`inline-flex flex-col gap-1 px-2 py-1 rounded border text-xs ${config.bgColor} ${config.textColor} ${config.borderColor}`}>
      <span className="font-medium">
        {config.icon} {label ?? config.label}
      </span>
      {showDescription && description && (
        <span className="text-xs opacity-75">{description}</span>
      )}
    </div>
  )
}
