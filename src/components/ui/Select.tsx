import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: string;
  label?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, label, id, children, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={id} className="block text-xs font-semibold text-brand-900 mb-1.5">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={id}
          className={twMerge(
            clsx(
              "flex h-10 w-full rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50",
              error && "border-red-500 focus:ring-red-500",
              className
            )
          )}
          {...props}
        >
          {children}
        </select>
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
    );
  }
);

Select.displayName = "Select";
