import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/10 bg-navy-900/70 p-5 shadow-glass backdrop-blur",
        className
      )}
      {...props}
    />
  );
}
