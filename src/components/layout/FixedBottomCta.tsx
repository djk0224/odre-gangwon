import { Download } from "lucide-react";
import { PremiumButton } from "@/components/ui/PremiumButton";

interface FixedBottomCtaProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

export function FixedBottomCta({ label, onClick, disabled }: FixedBottomCtaProps) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-[4.5rem] z-20 px-5">
      <PremiumButton
        className="pointer-events-auto w-full shadow-[0_12px_32px_rgba(47,74,58,0.28)]"
        disabled={disabled}
        onClick={onClick}
      >
        <Download aria-hidden="true" className="mr-2 size-4" />
        {label}
      </PremiumButton>
    </div>
  );
}
