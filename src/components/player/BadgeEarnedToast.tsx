import React from "react";
import { Trophy } from "lucide-react";

interface BadgeEarnedToastProps {
  badgeName: string;
  onClose?: () => void;
}

export const BadgeEarnedToast: React.FC<BadgeEarnedToastProps> = ({
  badgeName,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div 
        className="bg-card border border-team-primary/30 shadow-lg rounded-xl p-6 max-w-xs text-center animate-in fade-in zoom-in duration-300 pointer-events-auto"
        onClick={onClose}
      >
        <div className="w-16 h-16 rounded-full bg-team-primary/10 flex items-center justify-center mx-auto mb-4">
          <Trophy className="w-8 h-8 text-team-primary" />
        </div>
        <h3 className="text-lg font-bold mb-1">New Badge Earned! 🎉</h3>
        <p className="text-text-muted">{badgeName}</p>
        <p className="text-xs text-text-muted mt-3">Tap to dismiss</p>
      </div>
    </div>
  );
};
