import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

const appleButtonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold transition-all duration-200 apple-ease focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        primary:
          "bg-gradient-to-r from-primary to-[hsl(221,70%,60%)] text-white shadow-glow hover:brightness-110",
        secondary:
          "bg-white text-primary border-2 border-primary/20 hover:bg-primary hover:text-white hover:border-primary",
        outline:
          "border-2 border-gray-300 bg-transparent hover:border-primary hover:text-primary",
        ghost:
          "bg-transparent hover:bg-muted text-foreground",
        success:
          "bg-gradient-to-r from-success to-[hsl(160,60%,40%)] text-white shadow-[0_0_40px_-10px_hsl(var(--success)/0.3)] hover:brightness-110",
      },
      size: {
        sm: "h-9 px-4 text-sm",
        md: "h-11 px-6 text-base",
        lg: "h-14 px-8 text-lg",
        xl: "h-16 px-10 text-lg",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface AppleButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof appleButtonVariants> {
  asChild?: boolean;
  loading?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
}

const AppleButton = React.forwardRef<HTMLButtonElement, AppleButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      loading = false,
      iconLeft,
      iconRight,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";
    const isDisabled = disabled || loading;

    // IMPORTANT: Radix Slot requires exactly one child element.
    // When `asChild` is true, we must render ONLY `{children}` inside Slot.
    if (asChild) {
      return (
        <Comp
          className={cn(appleButtonVariants({ variant, size, className }))}
          ref={ref}
          aria-disabled={isDisabled || undefined}
          {...props}
        >
          {children}
        </Comp>
      );
    }

    return (
      <Comp
        className={cn(appleButtonVariants({ variant, size, className }))}
        ref={ref}
        disabled={isDisabled}
        {...props}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          iconLeft
        )}
        {children}
        {!loading && iconRight}
      </Comp>
    );
  }
);
AppleButton.displayName = "AppleButton";

export { AppleButton, appleButtonVariants };
