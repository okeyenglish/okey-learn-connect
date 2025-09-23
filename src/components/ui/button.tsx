import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 rounded-telegram-btn",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-telegram-btn",
        outline: "border border-input text-foreground bg-background hover:bg-accent hover:text-accent-foreground rounded-telegram-btn",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-telegram-btn",
        ghost: "hover:bg-accent hover:text-accent-foreground rounded-telegram-btn",
        link: "text-primary underline-offset-4 hover:underline rounded-none",
        soft: "bg-accent text-accent-foreground hover:bg-accent/80 rounded-telegram-btn",
        telegram: "bg-primary text-primary-foreground hover:bg-primary/90 rounded-telegram-btn shadow-telegram-card",
        hero: "bg-primary text-primary-foreground hover:bg-primary/90 rounded-telegram-btn shadow-telegram font-semibold",
      },
      size: {
        default: "h-11 px-5 py-2.5 min-w-[44px]",
        sm: "h-9 px-4 py-2 min-w-[44px] text-xs",
        lg: "h-12 px-6 py-3 min-w-[44px]",
        icon: "h-11 w-11 min-w-[44px]",
        touch: "h-14 px-6 py-3.5 min-w-[60px] text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
