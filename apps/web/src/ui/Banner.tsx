import { AlertTriangle, Info, XCircle } from "lucide-react";
import { cn } from "./cn";

const TONES = {
  info: { cls: "border-info/40 bg-surface text-text", Icon: Info, role: "status" },
  warn: { cls: "border-busy/50 bg-busy-soft text-text", Icon: AlertTriangle, role: "status" },
  error: { cls: "border-over/50 bg-over-soft text-text", Icon: XCircle, role: "alert" },
} as const;

export function Banner({
  tone,
  children,
  action,
}: {
  tone: keyof typeof TONES;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  const { cls, Icon, role } = TONES[tone];
  return (
    <div role={role} className={cn("flex items-center gap-3 rounded-lg border px-3 py-2 text-sm", cls)}>
      <Icon size={16} aria-hidden className="shrink-0" />
      <div className="flex-1">{children}</div>
      {action}
    </div>
  );
}
