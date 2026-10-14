import { createContext, useContext } from 'react'

// Provided by ToastProvider (Toast.jsx).
export const ToastContext = createContext(() => {})

export function useToast() {
  return useContext(ToastContext)
}
