import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-outfit font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-white/20 bg-white/10 text-white",
        scheduled:
          "border-rookie-blue/30 bg-rookie-blue/20 text-rookie-blue",
        completed:
          "border-success/30 bg-success/20 text-success",
        cancelled:
          "border-destructive/30 bg-destructive/20 text-destructive",
        full:
          "border-warning/30 bg-warning/20 text-warning",
        subscription:
          "border-rookie-purple/40 bg-rookie-purple/20 text-rookie-blue",
        single:
          "border-rookie-pink/40 bg-rookie-pink/20 text-rookie-pink",
        drop_in:
          "border-rookie-cyan/40 bg-rookie-cyan/20 text-rookie-cyan",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
