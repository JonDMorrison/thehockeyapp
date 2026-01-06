import React from "react";
import { Shield, Lock, Eye, EyeOff, Bell, Users, ToggleRight } from "lucide-react";

const settings = [
  { icon: Eye, label: "Show name to coach", enabled: true },
  { icon: Bell, label: "Practice reminders", enabled: true },
  { icon: Users, label: "Team leaderboards", enabled: false, locked: true },
  { icon: EyeOff, label: "Public profile", enabled: false, locked: true },
];

export const FeaturePrivacy: React.FC = () => {
  return (
    <div className="h-full w-full bg-background text-foreground overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-500" />
          <h1 className="text-base font-bold text-foreground">Privacy & Control</h1>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Parent control badge */}
        <div className="bg-emerald-500/10 rounded-xl p-4 border border-emerald-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center">
              <Lock className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-emerald-700">Parent Account</p>
              <p className="text-[10px] text-muted-foreground">You control all settings</p>
            </div>
          </div>
        </div>

        {/* Settings */}
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Privacy Settings
          </p>
          <div className="space-y-2">
            {settings.map((setting) => (
              <div
                key={setting.label}
                className="flex items-center justify-between p-3 rounded-xl bg-card border border-border"
              >
                <div className="flex items-center gap-3">
                  <setting.icon className={`w-4 h-4 ${setting.locked ? "text-muted-foreground" : "text-foreground"}`} />
                  <div>
                    <p className={`text-sm font-medium ${setting.locked ? "text-muted-foreground" : ""}`}>
                      {setting.label}
                    </p>
                    {setting.locked && (
                      <p className="text-[9px] text-emerald-600">Always off — we don't do this</p>
                    )}
                  </div>
                </div>
                <div className={`w-10 h-6 rounded-full flex items-center px-1 transition-colors ${
                  setting.locked 
                    ? "bg-muted cursor-not-allowed" 
                    : setting.enabled 
                      ? "bg-emerald-500 justify-end" 
                      : "bg-muted justify-start"
                }`}>
                  <div className={`w-4 h-4 rounded-full ${
                    setting.locked ? "bg-muted-foreground/30" : "bg-white shadow-sm"
                  }`} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Trust message */}
        <div className="bg-muted/30 rounded-xl p-4 text-center">
          <Shield className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
          <p className="text-xs font-medium">Your data stays private</p>
          <p className="text-[10px] text-muted-foreground mt-1">
            No social features. No public profiles. No selling data.
          </p>
        </div>
      </div>
    </div>
  );
};
