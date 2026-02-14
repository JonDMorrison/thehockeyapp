import React, { forwardRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Users, UserCircle, Dumbbell, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GetStartedModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Role type for localStorage
export type SelectedRole = "coach" | "player" | "solo";

// Helper to store/retrieve selected role
export const SELECTED_ROLE_KEY = "hockey_app_selected_role";

export const setSelectedRole = (role: SelectedRole) => {
  localStorage.setItem(SELECTED_ROLE_KEY, role);
};

export const getSelectedRole = (): SelectedRole | null => {
  return localStorage.getItem(SELECTED_ROLE_KEY) as SelectedRole | null;
};

export const clearSelectedRole = () => {
  localStorage.removeItem(SELECTED_ROLE_KEY);
};

const options = [
  {
    id: "coach",
    role: "coach" as SelectedRole,
    title: "I'm a Coach",
    description: "Create a team. Assign off-ice work. Free to get started.",
    icon: Users,
    buttonLabel: "Create Free Coach Account",
    buttonVariant: "default" as const,
    smallText: null as string | null,
    directHref: null as string | null,
    iconBgClass: "bg-gradient-to-br from-primary to-[hsl(221,70%,60%)]",
    hoverClass: "hover:border-primary/50",
  },
  {
    id: "parent",
    role: "solo" as SelectedRole, // parents go through solo/setup then upgrade
    title: "I'm a Parent",
    description: "Help your child build consistent habits at home.",
    icon: Dumbbell,
    buttonLabel: "Start Free 7-Day Trial",
    buttonVariant: "default" as const,
    smallText: "Credit card required. Cancel anytime.",
    directHref: null,
    iconBgClass: "bg-gradient-to-br from-orange-500 to-amber-500",
    hoverClass: "hover:border-orange-500/50",
  },
  {
    id: "player-team",
    role: "player" as SelectedRole,
    title: "I'm Joining a Team",
    description: "I already have a team invite.",
    icon: UserCircle,
    buttonLabel: "Join My Team",
    buttonVariant: "outline" as const,
    smallText: null as string | null,
    directHref: "/join" as string | null,
    iconBgClass: "bg-gradient-to-br from-success to-[hsl(160,60%,40%)]",
    hoverClass: "hover:border-success/50",
  },
];

export const GetStartedModal = forwardRef<HTMLDivElement, GetStartedModalProps>(
  ({ open, onOpenChange }, ref) => {
    const navigate = useNavigate();

    const handleSelect = (option: (typeof options)[0]) => {
      onOpenChange(false);

      if (option.directHref) {
        navigate(option.directHref);
        return;
      }

      setSelectedRole(option.role);
      navigate("/auth");
    };

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent ref={ref} className="sm:max-w-md p-0 gap-0 overflow-hidden">
          <DialogHeader className="p-6 pb-4">
            <DialogTitle className="text-xl text-center">
              How will you use The Hockey App?
            </DialogTitle>
          </DialogHeader>

          <div className="px-4 pb-6 space-y-4">
            {options.map((option) => {
              const Icon = option.icon;
              return (
                <div
                  key={option.id}
                  className={`p-5 rounded-xl border-2 border-border bg-card transition-all duration-200 ${option.hoverClass} hover:shadow-md`}
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${option.iconBgClass}`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-base">{option.title}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {option.description}
                      </p>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant={option.buttonVariant}
                    className={`w-full ${option.buttonVariant === "default" ? "bg-primary hover:bg-primary/90 text-white" : ""}`}
                    onClick={() => handleSelect(option)}
                  >
                    {option.buttonLabel}
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>

                  {option.smallText && (
                    <p className="text-xs text-muted-foreground text-center mt-2">
                      {option.smallText}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    );
  }
);

GetStartedModal.displayName = "GetStartedModal";
