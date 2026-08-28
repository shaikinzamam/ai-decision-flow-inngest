import * as React from "react";
import { cn } from "@/lib/utils";

export function Button({ className, variant = "default", size = "default", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "default" | "outline" | "ghost" | "danger"; size?: "default" | "sm" | "icon" }) {
  return <button className={cn("inline-flex items-center justify-center gap-2 rounded-lg font-medium transition disabled:pointer-events-none disabled:opacity-50", variant === "default" && "bg-indigo-600 text-white hover:bg-indigo-500", variant === "outline" && "border border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800", variant === "ghost" && "text-slate-300 hover:bg-slate-800", variant === "danger" && "bg-red-950 text-red-300 hover:bg-red-900", size === "default" && "h-10 px-4 text-sm", size === "sm" && "h-8 px-3 text-xs", size === "icon" && "size-9", className)} {...props} />;
}
