import { Check, Calendar, ClipboardList, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

interface OnboardingCompleteProps {
  teamName: string;
  onAction: (action: string) => void;
}

export function OnboardingComplete({ teamName, onAction }: OnboardingCompleteProps) {
  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Success icon */}
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <Check className="h-10 w-10 text-primary" />
        </div>

        {/* Message */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Your team is ready!</h1>
          <p className="text-muted-foreground">
            {teamName} is all set up. What would you like to do first?
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
            Create this week's plan
          </Button>

          <Button
            onClick={() => onAction("create_today")}
            variant="outline"
            className="w-full h-14 text-base"
            size="lg"
          >
            <ClipboardList className="mr-2 h-5 w-5" />
            Create today's practice
          </Button>

          <Button
            onClick={() => onAction("invite_parents")}
            variant="outline"
            className="w-full h-14 text-base"
            size="lg"
          >
            <Users className="mr-2 h-5 w-5" />
            Invite parents
          </Button>
        </div>

        {/* Skip link */}
        <button
          onClick={() => onAction("home")}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Go to team home
        </button>
      </div>
    </div>
  );
}
