import React from "react";
import { Shield, Lock, Eye, EyeOff, Bell, Users, ToggleRight } from "lucide-react";
import { useTranslation } from 'react-i18next';

export const FeaturePrivacy: React.FC = () => {
  const { t } = useTranslation();

  const settings = [
    { icon: Eye, label: t('marketing.privacy_show_name'), enabled: true },
    { icon: Bell, label: t('marketing.privacy_practice_reminders'), enabled: true },
    { icon: Users, label: t('marketing.privacy_team_leaderboards'), enabled: false, locked: true },
    { icon: EyeOff, label: t('marketing.privacy_public_profile'), enabled: false, locked: true },
  ];

  return (
    <div className="h-full w-full bg-background text-foreground overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-500" />
          <h1 className="text-base font-bold text-foreground">{t('marketing.privacy_control_heading')}</h1>
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
              <p className="text-sm font-semibold text-emerald-700">{t('marketing.privacy_parent_account')}</p>
              <p className="text-[10px] text-muted-foreground">{t('marketing.privacy_you_control')}</p>
            </div>
          </div>
        </div>

        {/* Settings */}
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            {t('marketing.privacy_settings_heading')}
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
                      <p className="text-[9px] text-emerald-600">{t('marketing.privacy_always_off')}</p>
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
          <p className="text-xs font-medium">{t('marketing.privacy_stay_private')}</p>
          <p className="text-[10px] text-muted-foreground mt-1">
            {t('marketing.privacy_no_social')}
          </p>
        </div>
      </div>
    </div>
  );
};
