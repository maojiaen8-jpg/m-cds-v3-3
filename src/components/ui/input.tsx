import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-10 w-full rounded-xl border border-white/15 bg-navy-800/70 px-3 text-sm text-slate-100 outline-none ring-0 placeholder:text-slate-400 focus:border-cyan-300",
        className
      )}
      {...props}
    />
  )
);

Input.displayName = "Input";
