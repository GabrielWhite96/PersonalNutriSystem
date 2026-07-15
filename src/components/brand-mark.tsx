import { cn } from "@/lib/utils";

type BrandMarkProps = {
  className?: string;
  size?: number;
  showWordmark?: boolean;
  label?: string;
};

/** App logo mark (+ optional wordmark). File: public/logoNutri.png */
export function BrandMark({
  className,
  size = 28,
  showWordmark = true,
  label = "Nutri",
}: BrandMarkProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <img
        src="/logoNutri.png"
        alt=""
        width={size}
        height={size}
        className="shrink-0 rounded-md object-contain"
        decoding="async"
      />
      {showWordmark ? (
        <span className="font-serif text-xl font-semibold leading-none">{label}</span>
      ) : null}
    </div>
  );
}
