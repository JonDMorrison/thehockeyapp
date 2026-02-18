import React from "react";
import { Users, Calendar, Home as HomeIcon, TrendingUp } from "lucide-react";
import { PhoneMockup } from "@/components/marketing/PhoneMockup";
import coachDashboardImg from "@/assets/mockup-coach-dashboard.png";
import practiceCardImg from "@/assets/feature-summer-program.png";
import todayChecklistImg from "@/assets/mockup-today-checklist.png";
import playerChecklistImg from "@/assets/mockup-player-checklist.png";

const features = [
  {
    icon: Users,
    title: "Perfect for coaches",
    description:
      "Give your team a structured off-ice program without adding to your workload. See who is putting in the work at a glance.",
    image: coachDashboardImg,
    imageAlt: "Coach dashboard showing team progress",
  },
  {
    icon: Calendar,
    title: "Run a spring or summer program",
    description:
      "Set up a 30-day challenge or off-season program in minutes. Players stay sharp between seasons with a plan that runs itself.",
    image: practiceCardImg,
    imageAlt: "Practice card builder for seasonal programs",
  },
  {
    icon: HomeIcon,
    title: "Set up your family",
    description:
      "Create a home development plan for your child. They follow their checklist, you follow their progress. No nagging required.",
    image: todayChecklistImg,
    imageAlt: "Player daily checklist view",
  },
  {
    icon: TrendingUp,
    title: "Works for any age or level",
    description:
      "From first-year players building basics to competitive athletes grinding every day. The app scales to fit your player.",
    image: playerChecklistImg,
    imageAlt: "Player checklist adapting to different skill levels",
  },
];

export const HomeFeaturesSection: React.FC = () => {
  return (
    <section className="relative py-20 lg:py-28 bg-[hsl(0,0%,96%)] overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-16 -left-24 w-80 h-80 rounded-full bg-primary/[0.04] blur-3xl" />
      <div className="absolute bottom-16 -right-20 w-72 h-72 rounded-full bg-[hsl(213,100%,25%,0.04)] blur-3xl" />
      <div className="absolute top-1/3 right-12 w-3 h-3 rounded-full bg-primary/15 hidden lg:block" />
      <div className="absolute top-1/2 left-16 w-2 h-2 rounded-full bg-primary/10 hidden lg:block" />
      <div className="absolute bottom-1/4 right-1/3 w-2 h-2 rounded-full bg-[hsl(213,100%,25%,0.12)] hidden lg:block" />

      {/* Subtle dot grid */}
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "radial-gradient(circle, hsl(0 0% 12%) 1px, transparent 1px)",
          backgroundSize: "36px 36px",
        }}
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section header */}
        <div className="text-center mb-16 lg:mb-20">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 text-foreground">
            It works where your kid actually trains.
          </h2>
          <p className="text-lg text-text-secondary max-w-2xl mx-auto">
            In the garage. In the basement. On the driveway before dinner. The
            Hockey App was built for real life, not ideal conditions.
          </p>
        </div>

        {/* Alternating two-column feature rows */}
        <div className="space-y-16 lg:space-y-24">
          {features.map((feature, i) => {
            const isReversed = i % 2 === 1;
            return (
              <div
                key={i}
                className={`grid lg:grid-cols-2 gap-8 lg:gap-16 items-center ${
                  isReversed ? "lg:direction-rtl" : ""
                }`}
              >
                {/* Text column */}
                <div
                  className={`${
                    isReversed ? "lg:order-2" : ""
                  } text-center lg:text-left`}
                >
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 mb-6 shadow-sm">
                    <feature.icon
                      className="w-7 h-7 text-primary"
                      strokeWidth={1.5}
                    />
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-bold mb-4 text-foreground">
                    {feature.title}
                  </h3>
                  <p className="text-lg text-text-secondary leading-relaxed max-w-md mx-auto lg:mx-0">
                    {feature.description}
                  </p>
                </div>

                {/* Visual column — decorative card */}
                <div
                  className={`${
                    isReversed ? "lg:order-1" : ""
                  } flex justify-center`}
                >
                  <img src={feature.image} alt={feature.imageAlt} className="w-56 lg:w-64 rounded-2xl shadow-xl" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
