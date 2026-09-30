import React from 'react'
import { AlertCircle } from 'lucide-react'
interface PlaceholderSectionProps {
  title: string
  description?: string
}
export function PlaceholderSection({
  title,
  description = 'Cette fonctionnalité sera bientôt disponible',
}: PlaceholderSectionProps) {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-blue-900/10 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-blue-900" />
          </div>
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-semibold text-foreground">{title}</h3>
          <p className="text-muted-foreground max-w-md">{description}</p>
        </div>
      </div>
    </div>
  )
}
