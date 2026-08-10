import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-9 w-full min-w-0 rounded-lg border border-border bg-card/42 px-3 py-1.5 text-sm text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.26)] outline-none backdrop-blur-xl transition-all duration-150 placeholder:text-muted-foreground disabled:pointer-events-none disabled:opacity-50 focus-visible:border-primary focus-visible:bg-card/70 focus-visible:shadow-[var(--glow-primary)] dark:focus-visible:shadow-[var(--glow-primary-strong)] aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex w-full min-w-0 rounded-lg border border-border bg-card/42 p-3 text-sm leading-relaxed text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.26)] outline-none backdrop-blur-xl transition-all duration-150 placeholder:text-muted-foreground disabled:pointer-events-none disabled:opacity-50 focus-visible:border-primary focus-visible:bg-card/70 focus-visible:shadow-[var(--glow-primary)] dark:focus-visible:shadow-[var(--glow-primary-strong)] aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Input, Textarea }
