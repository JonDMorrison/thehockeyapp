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

// Role type for localStorage
export type SelectedRole = "coach" | "player" | "solo";

const options: {
  id: string;
  role: SelectedRole;
  title: string;
  subtitle: string;
  description: string;
  icon: typeof Users;
  directHref?: string; // For routes that don't need auth first
  color: string;
  bgClass: string;
  iconBgClass: string;
  hoverClass: string;
}[] = [
  {
    id: "coach",
    role: "coach",
    title: "I'm a Coach",
    subtitle: "Start a Team",
    description: "Create practice plans and track your team's progress",
    icon: Users,
    color: "primary",
    bgClass: "bg-primary/10",
    iconBgClass: "bg-gradient-to-br from-primary to-[hsl(221,70%,60%)]",
    hoverClass: "hover:border-primary/50",
  },
  {
    id: "player-team",
    role: "player",
    title: "I'm a Player",
    subtitle: "Join My Team",
    description: "Your coach invited you to train together",
    icon: UserCircle,
    directHref: "/join", // Join flow doesn't need auth first
    color: "success",
    bgClass: "bg-success/10",
    iconBgClass: "bg-gradient-to-br from-success to-[hsl(160,60%,40%)]",
    hoverClass: "hover:border-success/50",
  },
  {
    id: "player-solo",
    role: "solo",
    title: "I'm a Player",
    subtitle: "Train On My Own",
    description: "Build your own training plan without a team",
    icon: Dumbbell,
    color: "orange",
    bgClass: "bg-orange-500/10",
    iconBgClass: "bg-gradient-to-br from-orange-500 to-amber-500",
    hoverClass: "hover:border-orange-500/50",
  },
];

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

export const GetStartedModal: React.FC<GetStartedModalProps> = ({
  open,
  onOpenChange,
}) => {
  const navigate = useNavigate();

  const handleSelect = (option: typeof options[0]) => {
    onOpenChange(false);
    
    // If this option has a direct route (like /join), go there
    if (option.directHref) {
      navigate(option.directHref);
      return;
    }
    
    // Otherwise, store the role and go to auth
    setSelectedRole(option.role);
    navigate("/auth");
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
                onClick={() => handleSelect(option)}
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