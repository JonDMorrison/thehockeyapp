import React from "react";
import { Target, Scale, Heart, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tag } from "@/components/app/Tag";

interface ThemeCardProps {
  id: string;
  title: string;
  description: string;
  icon: string;
  gradient: string;
  tag?: string;
  selected?: boolean;
  onClick: () => void;
}

const iconMap: Record<string, React.ElementType> = {
  Target,
  Scale,
  Heart,
  Trophy,
};

export const ThemeCard: React.FC<ThemeCardProps> = ({
  title,
  description,
  icon,
  gradient,
  tag,
  selected,
  onClick,
}) => {
  const IconComponent = iconMap[icon] || Target;

  return (
    <button
      onClick={onClick}
      className={cn(
        "relative w-full p-4 rounded-2xl text-left transition-all duration-200",
        "bg-card border-2 hover:shadow-medium active:scale-[0.98]",
        selected 
          ? "border-team-primary shadow-medium ring-2 ring-team-primary/20" 
          : "border-transparent hover:border-border"
      )}
    >
      {/* Icon with gradient background */}
      <div className={cn(
        "w-12 h-12 rounded-xl mb-3 flex items-center justify-center bg-gradient-to-br",
        gradient
      )}>
        <IconComponent className="w-6 h-6 text-white" />
      </div>

      {/* Content */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-foreground">{title}</h3>
          {tag && (
            <Tag variant="accent" size="sm">{tag}</Tag>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      {/* Selected indicator */}
      {selected && (
        <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-team-primary flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}
    </button>
  );
};
