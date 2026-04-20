import * as React from "react";
import { cn } from "@/lib/utils";

type SelectProps = React.ComponentProps<"select">;

export function Select({ className, children, ...props }: SelectProps) {
  return (
    <select
      className={cn(
        "h-10 w-full rounded-xl border border-white/15 bg-navy-800/70 px-3 text-sm text-slate-100 outline-none focus:border-cyan-300",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}
