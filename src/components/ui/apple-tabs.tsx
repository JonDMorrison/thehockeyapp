import * as React from "react";
import { cn } from "@/lib/utils";

interface AppleTabsProps {
  tabs: { value: string; label: string; icon?: React.ReactNode }[];
  activeTab: string;
  onTabChange: (value: string) => void;
  className?: string;
}

export const AppleTabs: React.FC<AppleTabsProps> = ({
  tabs,
  activeTab,
  onTabChange,
  className,
}) => {
  const activeIndex = tabs.findIndex((tab) => tab.value === activeTab);

  return (
    <div className={cn("relative", className)}>
      <div className="flex border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => onTabChange(tab.value)}
            className={cn(
              "relative flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors duration-200 apple-ease",
              activeTab === tab.value
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>
      {/* Animated underline */}
      <div
        className="absolute bottom-0 h-0.5 bg-primary transition-all duration-300 apple-ease"
        style={{
          width: `${100 / tabs.length}%`,
          left: `${(activeIndex / tabs.length) * 100}%`,
        }}
      />
    </div>
  );
};
