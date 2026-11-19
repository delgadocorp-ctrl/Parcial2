import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "success" | "warning" | "danger" | "neutral" | "info";
}

export function Badge({ className, variant = "neutral", children, ...props }: BadgeProps) {
  const variants = {
    success: "bg-emerald-100 text-emerald-800 border-emerald-200",
    warning: "bg-amber-100 text-amber-800 border-amber-200",
    danger: "bg-red-100 text-red-800 border-red-200",
    neutral: "bg-gray-100 text-gray-800 border-gray-200",
    info: "bg-blue-100 text-blue-800 border-blue-200",
  };

  return (
    <span
      className={twMerge(
        clsx(
          "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border",
          variants[variant],
          className
        )
      )}
      {...props}
    >
      {children}
    </span>
  );
}
