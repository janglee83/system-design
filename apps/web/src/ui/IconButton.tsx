import { forwardRef } from "react";
import { cn } from "./cn";
import { Tooltip } from "./Tooltip";

type Props = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "aria-label"> & {
  label: string;
  shortcut?: string;
  active?: boolean;
};

export const IconButton = forwardRef<HTMLButtonElement, Props>(function IconButton(
  { label, shortcut, active, className, type = "button", children, ...rest },
  ref,
) {
  return (
    <Tooltip content={label} shortcut={shortcut}>
      <button
        ref={ref}
        type={type}
        aria-label={label}
        aria-pressed={active}
        className={cn(
          "inline-flex size-8 items-center justify-center rounded-md text-text-2",
          "transition-colors duration-120 ease-sd hover:bg-surface-2 hover:text-text",
          "disabled:cursor-not-allowed disabled:opacity-50",
          active && "bg-accent-soft text-accent",
          className,
        )}
        {...rest}
      >
        {children}
      </button>
    </Tooltip>
  );
});
