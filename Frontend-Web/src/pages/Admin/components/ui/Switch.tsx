import React from 'react'
interface SwitchProps {
  id?: string
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  size?: 'default' | 'sm'
  className?: string
}
export function Switch({
  id,
  checked = false,
  onCheckedChange,
  size = 'default',
  className = '',
}: SwitchProps) {
  const trackSize = size === 'sm' ? 'h-4 w-8' : 'h-6 w-11'
  const thumbSize = size === 'sm' ? 'h-3 w-3' : 'h-5 w-5'
  const translate =
    size === 'sm'
      ? checked
        ? 'translate-x-4'
        : 'translate-x-0.5'
      : checked
        ? 'translate-x-5'
        : 'translate-x-0.5'
  return (
    <button
      id={id}
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange?.(!checked)}
      className={`peer inline-flex shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${trackSize} ${checked ? 'bg-blue-900' : 'bg-input'} ${className}`}
    >
      <span
        className={`pointer-events-none block rounded-full bg-background shadow-lg ring-0 transition-transform ${thumbSize} ${translate}`}
      />
    </button>
  )
}
