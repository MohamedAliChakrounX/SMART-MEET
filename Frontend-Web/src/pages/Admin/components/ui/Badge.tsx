import React from 'react'
interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'destructive'
}
export function Badge({
  variant = 'default',
  className = '',
  children,
  ...props
}: BadgeProps) {
  const base =
    'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors'
  const variants: Record<string, string> = {
    default: 'border-transparent bg-primary text-primary-foreground',
    secondary: 'border-transparent bg-secondary text-secondary-foreground',
    outline: 'text-foreground',
    destructive:
      'border-transparent bg-destructive text-destructive-foreground',
  }
  return (
    <span className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </span>
  )
}
