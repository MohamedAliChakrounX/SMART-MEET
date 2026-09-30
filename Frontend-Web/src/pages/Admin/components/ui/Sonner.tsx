import React from 'react'
import { Toaster as SonnerToaster } from 'sonner'
interface ToasterProps {
  position?:
    | 'top-left'
    | 'top-right'
    | 'bottom-left'
    | 'bottom-right'
    | 'top-center'
    | 'bottom-center'
}
export function Toaster({ position = 'top-right' }: ToasterProps) {
  return <SonnerToaster position={position} richColors />
}
