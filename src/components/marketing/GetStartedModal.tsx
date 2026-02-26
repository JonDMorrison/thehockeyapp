import React, { forwardRef } from "react";
import { BETA_MODE } from "@/core/constants";
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
    description: BETA_MODE
      ? "Create your team and assign off-ice workouts — completely free during the beta."
      : "Create your team and assign off-ice workouts — always free. Upgrade to a Team Plan ($500/yr) to cover your entire roster.",
    icon: Users,
    buttonLabel: "Start Coaching — Free",
    buttonVariant: "default" as const,
    smallText: "No credit card required.",
    directHref: null as string | null,
    iconBgClass: "bg-gradient-to-br from-primary to-[hsl(221,70%,60%)]",
    hoverClass: "hover:border-primary/50",
  },
  {
    id: "parent",
    role: "solo" as SelectedRole,
    title: "I'm a Parent",
    description: BETA_MODE
      ? "Build consistent off-ice habits at home. All features free during the beta period."
      : "Build consistent off-ice habits at home. 7-day free trial, then $15/mo. If your team has a plan, you're already covered.",
    icon: Dumbbell,
    buttonLabel: BETA_MODE ? "Get Started Free" : "Start 7-Day Free Trial",
    buttonVariant: "default" as const,
    smallText: BETA_MODE ? "No credit card required." : "Credit card required · Cancel anytime",
    directHref: null,
    iconBgClass: "bg-gradient-to-br from-orange-500 to-amber-500",
    hoverClass: "hover:border-orange-500/50",
  },
  {
    id: "player-team",
    role: "player" as SelectedRole,
    title: "I'm Joining a Team",
    description: "Your coach invited you. If your team has a plan, everything is included — no extra cost.",
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
          <DialogHeader className="p-6 pb-2 text-center">
            <DialogTitle className="text-xl">
              {BETA_MODE ? "Get started free during the beta." : "Start free. Choose your role."}
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {BETA_MODE
                ? "All features unlocked. No credit card required."
                : "Coaches use it free. Parents start with a 7-day trial. Teams can cover everyone."}
            </p>
          </DialogHeader>

          <div className="px-4 pb-4 space-y-4">
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


            <p className="text-[11px] text-muted-foreground/70 text-center pt-2 pb-2">
              {BETA_MODE ? "All features free during the beta. No hidden fees." : "Free for coaches. Teams can cover families. No hidden fees."}
            </p>
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
