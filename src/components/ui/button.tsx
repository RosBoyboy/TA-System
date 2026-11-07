import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-[6px] border border-transparent bg-clip-padding text-[13px] font-medium whitespace-nowrap transition-colors outline-none select-none focus-visible:border-[#1B4332] focus-visible:ring-2 focus-visible:ring-[#1B4332]/20 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-[#1B4332] text-white hover:bg-[#143326]",
        outline:
          "border-[#E5E5E7] bg-white text-[#1D1D1F] hover:bg-[#F2F2F7] aria-expanded:bg-[#F5F5F7]",
        secondary:
          "bg-[#F5F5F7] text-[#1D1D1F] border-[#E5E5E7] hover:bg-[#E5E5EA]/70 aria-expanded:bg-[#F2F2F7]",
        ghost:
          "text-[#1D1D1F] hover:bg-[#F2F2F7] aria-expanded:bg-[#F2F2F7]",
        destructive:
          "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 focus-visible:border-rose-400 focus-visible:ring-rose-200",
        link: "text-[#1B4332] underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-8 gap-1.5 px-[14px] text-[13px] font-medium has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5 [&_svg:not([class*='size-'])]:size-4",
        xs: "h-6 gap-1 rounded-[4px] px-2 text-[11px] has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1.5 rounded-[6px] px-2.5 text-xs font-medium has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 gap-1.5 rounded-[6px] px-4 text-[13px] font-medium has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3 [&_svg:not([class*='size-'])]:size-4",
        icon: "size-8 rounded-[6px] [&_svg:not([class*='size-'])]:size-4",
        "icon-xs": "size-6 rounded-[4px] [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-7 rounded-[6px] [&_svg:not([class*='size-'])]:size-3.5",
        "icon-lg": "size-9 rounded-[6px] [&_svg:not([class*='size-'])]:size-4",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
