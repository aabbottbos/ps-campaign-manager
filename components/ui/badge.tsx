import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        // Default - gray badge
        default:
          "bg-gray-100 text-gray-700 border-none",
        // Info - blue badge
        info:
          "bg-ps-blue-50 text-ps-blue border-none",
        // Success - green
        success:
          "bg-green-100 text-green-700 border-none",
        // Destructive - red
        destructive:
          "bg-red-100 text-red-700 border-none",
        // Warning - yellow
        warning:
          "bg-yellow-100 text-yellow-700 border-none",
        // Outline - transparent with border
        outline:
          "bg-transparent text-gray-700 border border-gray-200",
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
