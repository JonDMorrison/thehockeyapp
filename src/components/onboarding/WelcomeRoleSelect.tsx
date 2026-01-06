import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, UserCircle, Dumbbell, ArrowRight, Sparkles, Shield, Calendar, Zap, Target, Clock } from "lucide-react";
import { AppleButton } from "@/components/ui/apple-button";

interface WelcomeRoleSelectProps {
  displayName?: string;
}

export const WelcomeRoleSelect: React.FC<WelcomeRoleSelectProps> = ({ displayName }) => {
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState<"coach" | "player" | "solo" | null>(null);

  const firstName = displayName?.split(" ")[0] || "there";

  const handleContinue = () => {
    if (selectedRole === "coach") {
      navigate("/teams/new");
    } else if (selectedRole === "solo") {
      navigate("/solo/setup");
    } else {
      navigate("/players/new");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-1/4 w-80 h-80 bg-success/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(hsl(var(--primary)) 1px, transparent 1px),
                             linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)`,
            backgroundSize: '60px 60px'
          }}
        />
      </div>

      <div className="relative flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div className="max-w-lg w-full text-center">
          {/* Welcome badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 backdrop-blur-sm border border-gray-200 shadow-soft mb-6">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-muted-foreground">Welcome to Hockey App</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
            <span className="bg-gradient-to-r from-primary via-[hsl(221,70%,60%)] to-[hsl(200,70%,55%)] bg-clip-text text-transparent">
              Hey {firstName}! 👋
            </span>
          </h1>
          <p className="text-lg text-muted-foreground mb-10">
            Let's get you set up. What brings you here?
          </p>

          {/* Role Selection */}
          <div className="grid gap-4 mb-10">
            {/* Coach Option */}
            <button
              onClick={() => setSelectedRole("coach")}
              className={`relative p-6 rounded-2xl border-2 text-left transition-all duration-200 ${
                selectedRole === "coach"
                  ? "border-primary bg-primary/5 shadow-glow"
                  : "border-gray-200 bg-white/60 backdrop-blur-sm hover:border-primary/50 hover:shadow-soft"
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                  selectedRole === "coach"
                    ? "bg-gradient-to-br from-primary to-[hsl(221,70%,60%)]"
                    : "bg-primary/10"
                }`}>
                  <Users className={`w-7 h-7 ${selectedRole === "coach" ? "text-white" : "text-primary"}`} />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-1">I'm a Coach</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Create practice plans, track team progress, and keep families engaged.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted text-xs font-medium text-muted-foreground">
                      <Calendar className="w-3 h-3" /> Weekly plans
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted text-xs font-medium text-muted-foreground">
                      <Zap className="w-3 h-3" /> AI-assisted
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted text-xs font-medium text-muted-foreground">
                      <Shield className="w-3 h-3" /> Free forever
                    </span>
                  </div>
                </div>
              </div>
              {selectedRole === "coach" && (
                <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </button>

            {/* Player/Parent Option (joining a team) */}
            <button
              onClick={() => setSelectedRole("player")}
              className={`relative p-6 rounded-2xl border-2 text-left transition-all duration-200 ${
                selectedRole === "player"
                  ? "border-success bg-success/5 shadow-[0_0_40px_-10px_hsl(var(--success)/0.3)]"
                  : "border-gray-200 bg-white/60 backdrop-blur-sm hover:border-success/50 hover:shadow-soft"
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                  selectedRole === "player"
                    ? "bg-gradient-to-br from-success to-[hsl(160,60%,40%)]"
                    : "bg-success/10"
                }`}>
                  <UserCircle className={`w-7 h-7 ${selectedRole === "player" ? "text-white" : "text-success"}`} />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-1">Joining a Team</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Your coach has invited you. Track assigned workouts and team progress.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted text-xs font-medium text-muted-foreground">
                      Coach-led plans
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted text-xs font-medium text-muted-foreground">
                      Team sync
                    </span>
                  </div>
                </div>
              </div>
              {selectedRole === "player" && (
                <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-success flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </button>

            {/* Train On My Own Option */}
            <button
              onClick={() => setSelectedRole("solo")}
              className={`relative p-6 rounded-2xl border-2 text-left transition-all duration-200 ${
                selectedRole === "solo"
                  ? "border-orange-500 bg-orange-500/5 shadow-[0_0_40px_-10px_hsl(25,95%,53%/0.3)]"
                  : "border-gray-200 bg-white/60 backdrop-blur-sm hover:border-orange-500/50 hover:shadow-soft"
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                  selectedRole === "solo"
                    ? "bg-gradient-to-br from-orange-500 to-amber-500"
                    : "bg-orange-500/10"
                }`}>
                  <Dumbbell className={`w-7 h-7 ${selectedRole === "solo" ? "text-white" : "text-orange-500"}`} />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-1">Train On My Own</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Train independently with pre-built workouts. No team or coach needed.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted text-xs font-medium text-muted-foreground">
                      <Target className="w-3 h-3" /> Pick your focus
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted text-xs font-medium text-muted-foreground">
                      <Clock className="w-3 h-3" /> Your schedule
                    </span>
                  </div>
                </div>
              </div>
              {selectedRole === "solo" && (
                <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </button>
          </div>

          {/* Continue Button */}
          <AppleButton
            size="lg"
            onClick={handleContinue}
            disabled={!selectedRole}
            variant={selectedRole === "player" ? "success" : "primary"}
            className={`w-full sm:w-auto min-w-[200px] ${selectedRole === "solo" ? "!bg-orange-500 hover:!bg-orange-600" : ""}`}
          >
            Continue
            <ArrowRight className="w-5 h-5" />
          </AppleButton>
        </div>
      </div>
    </div>
  );
};
