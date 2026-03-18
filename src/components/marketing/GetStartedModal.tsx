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
import { useTranslation } from 'react-i18next';

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

export const GetStartedModal = forwardRef<HTMLDivElement, GetStartedModalProps>(
  ({ open, onOpenChange }, ref) => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const options = [
      {
        id: "coach",
        role: "coach" as SelectedRole,
        title: t('marketing.get_started_coach_title'),
        description: BETA_MODE
          ? t('marketing.get_started_coach_desc_beta')
          : t('marketing.get_started_coach_desc_normal'),
        icon: Users,
        buttonLabel: t('marketing.get_started_coach_button'),
        buttonVariant: "default" as const,
        smallText: t('marketing.get_started_coach_small') as string | null,
        directHref: null as string | null,
        iconBgClass: "bg-gradient-to-br from-primary to-[hsl(221,70%,60%)]",
        hoverClass: "hover:border-primary/50",
      },
      {
        id: "parent",
        role: "solo" as SelectedRole,
        title: t('marketing.get_started_parent_title'),
        description: BETA_MODE
          ? t('marketing.get_started_parent_desc_beta')
          : t('marketing.get_started_parent_desc_normal'),
        icon: Dumbbell,
        buttonLabel: BETA_MODE ? t('marketing.get_started_parent_button_beta') : t('marketing.get_started_parent_button_normal'),
        buttonVariant: "default" as const,
        smallText: (BETA_MODE ? t('marketing.get_started_parent_small_beta') : t('marketing.get_started_parent_small_normal')) as string | null,
        directHref: null,
        iconBgClass: "bg-gradient-to-br from-orange-500 to-amber-500",
        hoverClass: "hover:border-orange-500/50",
      },
      {
        id: "player-team",
        role: "player" as SelectedRole,
        title: t('marketing.get_started_player_title'),
        description: t('marketing.get_started_player_desc'),
        icon: UserCircle,
        buttonLabel: t('marketing.get_started_player_button'),
        buttonVariant: "outline" as const,
        smallText: null as string | null,
        directHref: "/join" as string | null,
        iconBgClass: "bg-gradient-to-br from-success to-[hsl(160,60%,40%)]",
        hoverClass: "hover:border-success/50",
      },
    ];

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
              {BETA_MODE ? t('marketing.get_started_heading_beta') : t('marketing.get_started_heading_normal')}
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {BETA_MODE
                ? t('marketing.get_started_all_features_unlocked_beta')
                : t('marketing.get_started_coaches_subtitle')}
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
                </div>
              );
            })}

            {/* Disclaimer shown once, below all option cards */}
            <p className="text-[11px] text-muted-foreground/70 text-center pt-2 pb-2">
              {BETA_MODE ? t('marketing.get_started_all_features_beta') : t('marketing.get_started_coaches_free')}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }
);

GetStartedModal.displayName = "GetStartedModal";
