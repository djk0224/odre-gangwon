import { cn } from "@/lib/utils";

interface StepWizardHeaderProps {
  step: number;
  total: number;
  icon?: React.ReactNode;
  title: string;
  description?: string;
}

export function StepWizardHeader({
  step,
  total,
  icon,
  title,
  description,
}: StepWizardHeaderProps) {
  return (
    <div className="px-5 pt-2 text-center">
      <p className="text-right text-sm font-semibold text-pine">
        {step}/{total}
      </p>
      {icon ? <div className="mt-6 flex justify-center">{icon}</div> : null}
      <h1 className={cn("text-2xl font-bold leading-8 text-ink", icon ? "mt-5" : "mt-8")}>
        {title}
      </h1>
      {description ? (
        <p className="mt-2 text-sm leading-6 text-stone">{description}</p>
      ) : null}
    </div>
  );
}
