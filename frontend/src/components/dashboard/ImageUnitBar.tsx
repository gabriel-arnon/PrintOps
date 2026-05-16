import { Wrench } from "lucide-react";
import { getTonerLevel, tonerTextClass } from "@/lib/toner";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ImageUnitBarProps {
  percent: number;
  className?: string;
}

export function ImageUnitBar({ percent, className }: ImageUnitBarProps) {
  const clamped = Math.max(0, Math.min(100, percent));
  const level = getTonerLevel(clamped);

  const fillBg =
    level === "ok"
      ? "bg-[oklch(0.72_0.17_152)]"
      : level === "warn"
        ? "bg-[oklch(0.78_0.16_75)]"
        : "bg-[oklch(0.62_0.22_25)]";

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn("flex items-center gap-2 min-w-[140px]", className)}>
            <Wrench className={cn("h-3.5 w-3.5 shrink-0", tonerTextClass[level])} />
            <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className={cn("h-full rounded-full transition-all duration-700 ease-out", fillBg)}
                style={{ width: `${clamped}%` }}
              />
            </div>
            <span className={cn("w-10 text-right text-xs font-semibold tabular-nums", tonerTextClass[level])}>
              {clamped}%
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent>Vida útil restante da unidade de imagem</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
