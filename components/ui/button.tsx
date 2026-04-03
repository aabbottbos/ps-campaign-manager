import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ps-blue focus-visible:border-transparent disabled:pointer-events-none disabled:opacity-40 disabled:cursor-not-allowed",
  {
    variants: {
      variant: {
        // Primary CTA - Product School blue (matching enterprise-pricing-app)
        default: "bg-ps-blue text-white hover:bg-ps-navy",
        // Secondary/Ghost - transparent with border
        secondary:
          "bg-white border border-gray-200 text-gray-600 hover:text-gray-900 hover:border-gray-300",
        ghost: "bg-transparent hover:bg-gray-50 text-gray-600 hover:text-gray-900",
        // Destructive - red for danger actions
        destructive:
          "bg-red-600 text-white hover:bg-red-700",
        // Outline variant
        outline:
          "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300",
        // Link variant
        link: "text-ps-blue hover:text-ps-navy underline-offset-4 hover:underline bg-transparent",
        // Success variant
        success: "bg-green-600 text-white hover:bg-green-700",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-8 px-3 py-1.5 text-xs",
        lg: "h-11 px-6 py-2.5",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
