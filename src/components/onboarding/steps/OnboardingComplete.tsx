import { Check, Calendar, ClipboardList, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

interface OnboardingCompleteProps {
  teamName: string;
  onAction: (action: string) => void;
}

export function OnboardingComplete({ teamName, onAction }: OnboardingCompleteProps) {
  const { t } = useTranslation();
  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Success icon */}
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <Check className="h-10 w-10 text-primary" />
        </div>

        {/* Message */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">{t("welcome.onboardingComplete.title")}</h1>
          <p className="text-muted-foreground">
            {t("welcome.onboardingComplete.subtitle", { teamName })}
          </p>
        </div>

        {/* Quick actions */}
        <div className="space-y-3">
          <Button
            onClick={() => onAction("create_week")}
            className="w-full h-14 text-base"
            size="lg"
          >
            <Calendar className="mr-2 h-5 w-5" />
            {t("welcome.onboardingComplete.createWeekButton")}
          </Button>

          <Button
            onClick={() => onAction("create_today")}
            variant="outline"
            className="w-full h-14 text-base"
            size="lg"
          >
            <ClipboardList className="mr-2 h-5 w-5" />
            {t("welcome.onboardingComplete.createTodayButton")}
          </Button>

          <Button
            onClick={() => onAction("invite_parents")}
            variant="outline"
            className="w-full h-14 text-base"
            size="lg"
          >
            <Users className="mr-2 h-5 w-5" />
            {t("welcome.onboardingComplete.inviteParentsButton")}
          </Button>
        </div>

        {/* Skip link */}
        <button
          onClick={() => onAction("home")}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {t("welcome.onboardingComplete.goToTeamHome")}
        </button>
      </div>
    </div>
  );
}
