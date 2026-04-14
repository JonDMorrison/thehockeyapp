import React from "react";
import { Link } from "react-router-dom";
import { Heart, Shield, Lock } from "lucide-react";
import { HockeyAppLogo } from "./HockeyAppLogo";
import { BETA_MODE } from "@/core/constants";
import { useTranslation } from 'react-i18next';

export const MarketingFooter: React.FC = () => {
  const { t } = useTranslation();
  return (
    <footer className="bg-foreground text-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-4 gap-8 mb-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 flex items-center justify-center overflow-hidden">
                <HockeyAppLogo size={28} />
              </div>
              <span className="font-bold text-lg">{t('marketing.footer_brand_name')}</span>
            </div>
            <p className="text-background/70 max-w-sm mb-6">
              {t('marketing.footer_brand_desc')}
            </p>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 text-sm text-background/60">
                <Shield className="w-4 h-4" />
                <span>{t('marketing.footer_privacy')}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-background/60">
                <Lock className="w-4 h-4" />
                <span>{t('marketing.footer_coppa')}</span>
              </div>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold mb-4">{t('marketing.footer_product')}</h4>
            <ul className="space-y-2 text-background/70">
              <li><Link to="/features" className="hover:text-background transition-colors">{t('marketing.footer_features')}</Link></li>
              <li><Link to="/demo" className="hover:text-background transition-colors">{t('marketing.footer_how_it_works')}</Link></li>
              {!BETA_MODE && (
                <li><Link to="/pricing" className="hover:text-background transition-colors">{t('marketing.footer_pricing')}</Link></li>
              )}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">{t('marketing.footer_company')}</h4>
            <ul className="space-y-2 text-background/70">
              <li><Link to="/about" className="hover:text-background transition-colors">{t('marketing.footer_about')}</Link></li>
              <li><Link to="/privacy" className="hover:text-background transition-colors">{t('marketing.footer_privacy_policy')}</Link></li>
              <li><Link to="/terms" className="hover:text-background transition-colors">{t('marketing.footer_terms')}</Link></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-background/10 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-background/50">
            &copy; {new Date().getFullYear()} The Hockey App. All rights reserved.
          </p>
          <p className="text-sm text-background/50 flex items-center gap-1">
            Made with <Heart className="w-3 h-3 text-destructive fill-current" /> {t('marketing.footer_made_with')}
          </p>
        </div>
      </div>
    </footer>
  );
};
