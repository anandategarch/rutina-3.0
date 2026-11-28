"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, ToasterProps } from "sonner"

const Toaster = ({ toastOptions, ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      toastOptions={{
        // Radius & elevasi toast mengikuti token app (shadow-lift punya varian
        // .dark di globals.css; border via var(--border)). Per-key merge:
        // pemanggil tetap bisa menimpa kelas per-slot via toastOptions.
        ...toastOptions,
        classNames: {
          toast: "rounded-xl shadow-lift border-border",
          description: "text-muted-foreground",
          ...toastOptions?.classNames,
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
