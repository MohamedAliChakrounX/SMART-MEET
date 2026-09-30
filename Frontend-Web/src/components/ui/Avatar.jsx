import React, { forwardRef } from 'react'
import { cn } from '../../lib/utils'

export const Avatar = forwardRef(({ className, src, alt, fallback, ...props }, ref) => {
    return (
        <div
            ref={ref}
            className={cn(
                'relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full bg-muted',
                className,
            )}
            {...props}
        >
            {src ? (
                <img
                    src={src}
                    alt={alt}
                    className="aspect-square h-full w-full object-cover"
                />
            ) : (
                <div className="flex h-full w-full items-center justify-center rounded-full bg-muted text-muted-foreground text-xs font-medium">
                    {fallback}
                </div>
            )}
        </div>
    )
})

Avatar.displayName = 'Avatar'
