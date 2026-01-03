import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground",
        outline: "border-border text-foreground",
        success:
          "border-transparent bg-success text-success-foreground",
        warning:
          "border-transparent bg-warning text-warning-foreground",
        glass: "bg-card/60 backdrop-blur-xl border-border/50 text-foreground",
        // Horizon badges
        "horizon-near": "border-transparent bg-primary/20 text-primary",
        "horizon-mid": "border-transparent bg-blue-500/20 text-blue-400",
        "horizon-far": "border-transparent bg-purple-500/20 text-purple-400",
        // Impact badges
        "impact-low": "border-transparent bg-success/20 text-success",
        "impact-medium": "border-transparent bg-warning/20 text-warning",
        "impact-high": "border-transparent bg-destructive/20 text-destructive",
        // Certainty badges
        "certainty-certain": "border-transparent bg-success/20 text-success",
        "certainty-uncertain": "border-transparent bg-warning/20 text-warning",
        "certainty-wildcard": "border-transparent bg-purple-500/20 text-purple-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
