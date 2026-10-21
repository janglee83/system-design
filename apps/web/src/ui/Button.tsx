import { forwardRef } from "react";
import { cn } from "./cn";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
};

const VARIANTS = {
  primary: "bg-accent text-on-accent hover:bg-accent-hover",
  secondary: "bg-surface text-text border border-border-strong hover:bg-surface-2",
  ghost: "bg-transparent text-text-2 hover:bg-surface-2 hover:text-text",
  danger: "bg-transparent text-over hover:bg-over-soft",
} as const;

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = "secondary", size = "md", className, type = "button", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-md font-medium whitespace-nowrap",
        "transition-colors duration-120 ease-sd disabled:cursor-not-allowed disabled:opacity-50",
        size === "md" ? "h-8 px-3 text-sm" : "h-7 px-2 text-xs",
        VARIANTS[variant],
        className,
      )}
      {...rest}
    />
  );
});
