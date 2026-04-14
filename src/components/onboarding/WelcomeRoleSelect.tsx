import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Users, UserCircle, Dumbbell, ArrowRight, Shield, Calendar, Zap, Target, Clock } from "lucide-react";
import { AppleButton } from "@/components/ui/apple-button";
import logoImage from "@/assets/hockey-app-logo.png";

interface WelcomeRoleSelectProps {
  displayName?: string;
}

export const WelcomeRoleSelect: React.FC<WelcomeRoleSelectProps> = ({ displayName }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState<"coach" | "player" | "solo" | null>(null);

  const firstName = displayName?.split(" ")[0] || t("welcome.roleSelect.defaultFirstName");

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
    <div className="fixed inset-0 z-50 bg-background flex flex-col overflow-y-auto">
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
        <div className="max-w-lg md:max-w-4xl w-full text-center">
          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <img src={logoImage} alt={t("auth.logoAlt")} className="w-10 h-10 object-contain" />
            <span className="text-2xl font-bold text-foreground">{t("auth.appName")}</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
            <span className="bg-gradient-to-r from-primary via-[hsl(221,70%,60%)] to-[hsl(200,70%,55%)] bg-clip-text text-transparent">
              {t("welcome.roleSelect.greeting", { firstName })}
            </span>
          </h1>
          <p className="text-lg text-muted-foreground mb-10">
            {t("welcome.roleSelect.subtitle")}
          </p>

          {/* Role Selection */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
            {/* Coach Option */}
            <button
              onClick={() => setSelectedRole("coach")}
              aria-pressed={selectedRole === "coach"}
              className={`relative p-6 rounded-2xl border-2 text-left transition-all duration-200 h-full ${
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
                  <h3 className="text-lg font-semibold mb-1">{t("welcome.roleSelect.coachTitle")}</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    {t("welcome.roleSelect.coachDescription")}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted text-xs font-medium text-muted-foreground">
                      <Calendar className="w-3 h-3" /> {t("welcome.roleSelect.coachFeature1")}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted text-xs font-medium text-muted-foreground">
                      <Zap className="w-3 h-3" /> {t("welcome.roleSelect.coachFeature2")}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted text-xs font-medium text-muted-foreground">
                      <Shield className="w-3 h-3" /> {t("welcome.roleSelect.coachFeature3")}
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
              aria-pressed={selectedRole === "player"}
              className={`relative p-6 rounded-2xl border-2 text-left transition-all duration-200 h-full ${
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
                  <h3 className="text-lg font-semibold mb-1">{t("welcome.roleSelect.playerTitle")}</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    {t("welcome.roleSelect.playerDescription")}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted text-xs font-medium text-muted-foreground">
                      {t("welcome.roleSelect.playerFeature1")}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted text-xs font-medium text-muted-foreground">
                      {t("welcome.roleSelect.playerFeature2")}
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
              aria-pressed={selectedRole === "solo"}
              className={`relative p-6 rounded-2xl border-2 text-left transition-all duration-200 h-full ${
                selectedRole === "solo"
                  ? "border-warning bg-warning/5 shadow-[0_0_40px_-10px_hsl(var(--warning)/0.3)]"
                  : "border-gray-200 bg-white/60 backdrop-blur-sm hover:border-warning/50 hover:shadow-soft"
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                  selectedRole === "solo"
                    ? "bg-gradient-to-br from-warning to-amber-500"
                    : "bg-warning/10"
                }`}>
                  <Dumbbell className={`w-7 h-7 ${selectedRole === "solo" ? "text-white" : "text-[hsl(var(--warning))]"}`} />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-1">{t("welcome.roleSelect.soloTitle")}</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    {t("welcome.roleSelect.soloDescription")}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted text-xs font-medium text-muted-foreground">
                      <Target className="w-3 h-3" /> {t("welcome.roleSelect.soloFeature1")}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted text-xs font-medium text-muted-foreground">
                      <Clock className="w-3 h-3" /> {t("welcome.roleSelect.soloFeature2")}
                    </span>
                  </div>
                </div>
              </div>
              {selectedRole === "solo" && (
                <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-warning flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </button>
          </div>

          {/* Hint when no role selected */}
          {!selectedRole && (
            <p className="text-sm text-muted-foreground text-center -mt-6">
              {t("welcome.roleSelect.selectRoleHint")}
            </p>
          )}

          {/* Continue Button */}
          <AppleButton
            size="lg"
            onClick={handleContinue}
            disabled={!selectedRole}
            variant={selectedRole === "player" ? "success" : "primary"}
            className={`w-full sm:w-auto min-w-[200px] ${selectedRole === "solo" ? "!bg-orange-500 hover:!bg-orange-600" : ""}`}
          >
            {t("common.continue")}
            <ArrowRight className="w-5 h-5" />
          </AppleButton>
        </div>
      </div>
    </div>
  );
};
