import React from "react";
import { Link } from "react-router-dom";
import { Heart, Shield, Lock } from "lucide-react";
import { HockeyAppLogo } from "./HockeyAppLogo";

export const MarketingFooter: React.FC = () => {
  return (
    <footer className="bg-foreground text-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-4 gap-8 mb-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center overflow-hidden">
                <HockeyAppLogo size={24} />
              </div>
              <span className="font-bold text-lg">The Hockey App</span>
            </div>
            <p className="text-background/70 max-w-sm mb-6">
              Off-ice training made simple. Coaches assign, kids complete, 
              parents stay in control.
            </p>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 text-sm text-background/60">
                <Shield className="w-4 h-4" />
                <span>Privacy First</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-background/60">
                <Lock className="w-4 h-4" />
                <span>COPPA Compliant</span>
              </div>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold mb-4">Product</h4>
            <ul className="space-y-2 text-background/70">
              <li><Link to="/features" className="hover:text-background transition-colors">Features</Link></li>
              <li><Link to="/demo" className="hover:text-background transition-colors">Demo</Link></li>
              <li><Link to="/auth" className="hover:text-background transition-colors">Sign Up</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Company</h4>
            <ul className="space-y-2 text-background/70">
              <li><Link to="/about" className="hover:text-background transition-colors">About</Link></li>
              <li><Link to="/privacy" className="hover:text-background transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-background transition-colors">Terms of Service</Link></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-background/10 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-background/50">
            © 2026 The Hockey App. All rights reserved.
          </p>
          <p className="text-sm text-background/50 flex items-center gap-1">
            Made with <Heart className="w-3 h-3 text-destructive" /> for hockey families
          </p>
        </div>
      </div>
    </footer>
  );
};
