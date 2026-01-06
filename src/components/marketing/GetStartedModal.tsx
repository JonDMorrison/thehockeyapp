import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Users, UserCircle, Dumbbell, ChevronRight } from "lucide-react";

interface GetStartedModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const options = [
  {
    id: "coach",
    title: "I'm a Coach",
    subtitle: "Start a Team",
    description: "Create practice plans and track your team's progress",
    icon: Users,
    href: "/auth",
    color: "primary",
    bgClass: "bg-primary/10",
    iconBgClass: "bg-gradient-to-br from-primary to-[hsl(221,70%,60%)]",
    hoverClass: "hover:border-primary/50",
  },
  {
    id: "player-team",
    title: "I'm a Player",
    subtitle: "Join My Team",
    description: "Your coach invited you to train together",
    icon: UserCircle,
    href: "/join",
    color: "success",
    bgClass: "bg-success/10",
    iconBgClass: "bg-gradient-to-br from-success to-[hsl(160,60%,40%)]",
    hoverClass: "hover:border-success/50",
  },
  {
    id: "player-solo",
    title: "I'm a Player",
    subtitle: "Train On My Own",
    description: "Build your own training plan without a team",
    icon: Dumbbell,
    href: "/solo/setup",
    color: "orange",
    bgClass: "bg-orange-500/10",
    iconBgClass: "bg-gradient-to-br from-orange-500 to-amber-500",
    hoverClass: "hover:border-orange-500/50",
  },
];

export const GetStartedModal: React.FC<GetStartedModalProps> = ({
  open,
  onOpenChange,
}) => {
  const navigate = useNavigate();

  const handleSelect = (href: string) => {
    onOpenChange(false);
    navigate(href);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="text-xl text-center">
            How would you like to get started?
          </DialogTitle>
        </DialogHeader>

        <div className="px-4 pb-6 space-y-3">
          {options.map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.id}
                onClick={() => handleSelect(option.href)}
                className={`w-full p-4 rounded-xl border-2 border-border bg-card text-left transition-all duration-200 ${option.hoverClass} hover:shadow-md hover:-translate-y-0.5 group`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${option.iconBgClass}`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-muted-foreground">{option.title}</p>
                    <p className="font-semibold">{option.subtitle}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>
            );
          })}
        </div>

        <div className="px-6 py-4 bg-muted/50 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            Free for everyone. No credit card required.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};