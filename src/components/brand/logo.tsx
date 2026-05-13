import { cn } from "@/lib/utils";

interface LogoMarkProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
}

export function LogoMark({ className, ...props }: LogoMarkProps) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 22 22"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn("text-accent", className)}
      {...props}
    >
      <path d="M16 4 Q 4 4, 4 11 Q 4 18, 16 18" />
      <circle cx="17" cy="11" r="1.8" fill="currentColor" stroke="none" />
    </svg>
  );
}

interface LogoProps {
  className?: string;
  showMark?: boolean;
  wordmarkClassName?: string;
}

export function Logo({
  className,
  showMark = true,
  wordmarkClassName,
}: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      {showMark && <LogoMark />}
      <span
        className={cn(
          "font-display text-foreground text-[15px] font-semibold tracking-tight",
          wordmarkClassName,
        )}
      >
        EnzymeForge
      </span>
    </span>
  );
}
