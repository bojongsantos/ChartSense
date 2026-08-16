import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

interface DeltaProps {
  value: number;
  direction?: "up" | "down" | "flat";
  className?: string;
}

export function Delta({ value, direction, className }: DeltaProps) {
  const dir = direction ?? (value > 0 ? "up" : value < 0 ? "down" : "flat");
  const Icon = dir === "up" ? ArrowUpRight : dir === "down" ? ArrowDownRight : Minus;
  const tone = dir === "up" ? "text-positive" : dir === "down" ? "text-negative" : "text-muted";
  const formatted = `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${tone} ${className ?? ""}`}>
      <Icon className="size-3.5" />
      {formatted}
    </span>
  );
}
