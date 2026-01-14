import React from "react";
import { motion } from "framer-motion";
import { Baby, Users, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface AddPlayerChoiceProps {
  onAddMyChild: () => void;
  onInviteFamilies: () => void;
  className?: string;
}

export const AddPlayerChoice: React.FC<AddPlayerChoiceProps> = ({
  onAddMyChild,
  onInviteFamilies,
  className,
}) => {
  const options = [
    {
      id: "my-child",
      title: "Add My Child",
      description: "I'm a coach-parent",
      icon: Baby,
      onClick: onAddMyChild,
      gradient: "from-amber-500 to-orange-500",
    },
    {
      id: "invite",
      title: "Invite Families",
      description: "Send link to parents",
      icon: Users,
      onClick: onInviteFamilies,
      gradient: "from-blue-500 to-indigo-500",
    },
  ];

  return (
    <div className={cn("grid grid-cols-2 gap-3", className)}>
      {options.map((option, index) => {
        const Icon = option.icon;
        return (
          <motion.button
            key={option.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={option.onClick}
            className={cn(
              "relative p-4 rounded-xl text-left overflow-hidden",
              "bg-gradient-to-br shadow-md",
              "border border-white/10",
              option.gradient
            )}
          >
            <div className="flex flex-col gap-2">
              <div className="p-2 rounded-lg bg-white/20 w-fit">
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-white text-sm">{option.title}</h3>
                <p className="text-xs text-white/80">{option.description}</p>
              </div>
            </div>
            <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
          </motion.button>
        );
      })}
    </div>
  );
};
