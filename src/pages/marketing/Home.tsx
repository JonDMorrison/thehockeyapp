import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { PhoneMockup } from "@/components/marketing/PhoneMockup";
import { MarketingAppPreview } from "@/components/marketing/MarketingAppPreview";
import { GetStartedModal } from "@/components/marketing/GetStartedModal";
import {
  CheckCircle,
  Shield,
  Wifi,
  ArrowRight,
  Trophy,
  Calendar,
  DollarSign,
} from "lucide-react";
import founderHomeImg from "@/assets/founder-jon-coaching.png";

const Home: React.FC = () => {
  const [showGetStarted, setShowGetStarted] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <MarketingNav />

      {/* Hero Section */}
      <section className="relative pt-16 bg-[hsl(0,0%,98%)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-[60px] pb-20 lg:pb-32">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="text-center lg:text-left">
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6 leading-[1.05] text-foreground">
                The off-ice accountability system{" "}
                <span className="text-primary">
                  for hockey families.
                </span>
              </h1>

              <p className="text-xl text-text-secondary font-medium mb-4 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                Clear weekly plans kids follow independently — so parents stop nagging, coaches stay aligned, and real progress happens.
              </p>

              <p className="text-sm text-text-muted mb-8 max-w-xl mx-auto lg:mx-0">
                Parents start with a 7-day free trial. Teams can cover families.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Button 
                  size="lg" 
                  className="text-base px-10 bg-primary hover:bg-[hsl(22,85%,40%)] transition-colors text-white rounded-xl shadow-[0_6px_20px_rgba(0,0,0,0.08)]"
                  onClick={() => setShowGetStarted(true)}
                >
                  Get Started For Free
                </Button>
              </div>
            </div>

            <div className="relative flex justify-center lg:justify-end">
              <div className="relative">
                <PhoneMockup 
                  showGlow={false}
                  className="w-72 lg:w-80"
                >
                  <MarketingAppPreview />
                </PhoneMockup>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The Problem Section */}
      <section className="py-20 lg:py-28 bg-[hsl(0,0%,96%)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-card rounded-2xl p-8 md:p-12 border border-border shadow-subtle">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-10 text-foreground">
              Everyone wants development. No one has a system.
            </h2>
            
            <div className="space-y-8 max-w-2xl mx-auto">
              <div className="space-y-5 text-lg text-text-secondary">
                <p>Coaches assign off-ice work but have no way to know if it gets done. They follow up manually — or stop assigning altogether.</p>
                <p>Players want to improve but don't have a clear routine. Without structure, good intentions fade.</p>
                <p>Parents end up filling the gap — reminding, nagging, tracking. It creates friction at home and puts them in a role they never signed up for.</p>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-primary">
                The Hockey App gives everyone a system — so development actually happens.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 lg:py-28 bg-background">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
              How it works
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Three roles. One clear system. Everyone knows what's expected.
            </p>
          </div>

          <div className="relative">
            {/* Connecting line - visible on desktop */}
            <div className="hidden md:block absolute top-10 left-[16.67%] right-[16.67%] h-px bg-gradient-to-r from-transparent via-border to-transparent" />
            
            <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
              {[
                {
                  step: "01",
                  role: "Parent",
                  title: "Stay in control",
                  description: "You own the account, see everything assigned and completed, and decide what the coach can see.",
                },
                {
                  step: "02",
                  role: "Player",
                  title: "Own the routine",
                  description: "Open the app, see today's tasks, check them off. Minutes a day, no reminders needed.",
                },
                {
                  step: "03",
                  role: "Coach",
                  title: "Assign and track",
                  description: "Create simple weekly task cards in minutes. See who's participating without rankings or pressure.",
                },
              ].map((item, i) => (
                <div key={i} className="relative text-center md:text-left">
                  <div className="mb-6 relative">
                    <span className="text-6xl lg:text-7xl font-bold text-muted-foreground/20">
                      {item.step}
                    </span>
                    {/* Dot connector on the line */}
                    <div className="hidden md:block absolute top-1/2 left-1/2 md:left-8 -translate-y-1/2 w-2 h-2 rounded-full bg-primary/40" />
                  </div>
                  
                  <span className="text-xs font-semibold text-primary uppercase tracking-widest">
                    {item.role}
                  </span>
                  
                  <h3 className="text-2xl font-bold mt-2 mb-3">{item.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid Section */}
      <section className="py-20 lg:py-28 bg-[hsl(0,0%,96%)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 text-foreground">
              Built for how hockey families actually live
            </h2>
            <p className="text-lg text-text-secondary max-w-2xl mx-auto">
              Practical features that fit into busy schedules.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-5 max-w-3xl mx-auto">
            {[
              {
                icon: Wifi,
                title: "Works offline",
                description: "Garages, basements, rinks with no signal — tasks sync when you're back online.",
              },
              {
                icon: Calendar,
                title: "Knows your schedule",
                description: "Syncs with team calendars. Adjusts training load around games and rest days.",
              },
              {
                icon: Shield,
                title: "Parent-controlled",
                description: "Parents own accounts and decide what coaches can see. Your child's data stays private.",
              },
              {
                icon: Trophy,
                title: "Milestone recognition",
                description: "Effort-based rewards for consistency. No leaderboards or comparisons — just personal progress.",
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="group rounded-xl p-6 transition-all duration-200 bg-card border border-border shadow-subtle hover:shadow-medium"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-primary" strokeWidth={1.75} />
                </div>
                <h3 className="text-lg font-semibold mb-2 text-foreground">
                  {feature.title}
                </h3>
                <p className="text-sm leading-relaxed text-text-muted">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Founder Section */}
      <section className="py-20 lg:py-28 bg-background">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div className="relative flex justify-center">
              <div className="rounded-2xl overflow-hidden shadow-subtle max-w-md w-full">
                <img
                  src={founderHomeImg}
                  alt="Jon Morrison coaching youth hockey players"
                  className="w-full h-auto object-cover"
                />
              </div>
            </div>

            <div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6 text-foreground">
                Built by a Coach.{" "}
                <span className="text-primary">Designed for Families.</span>
              </h2>

              <div className="space-y-4 text-base text-muted-foreground leading-relaxed">
                <p>
                  The Hockey App wasn't created by a tech company guessing at hockey culture.
                </p>
                <p>
                  It was built by a former BCHL player, minor hockey coach, and father of three daughters in the game.
                </p>
                <p>
                  After years of seeing the same pattern — parents nagging, players resisting, coaches frustrated — one thing became clear:
                </p>
                <p className="text-lg font-semibold text-foreground">
                  Families don't need more pressure. They need structure.
                </p>
                <p>
                  The Hockey App creates that structure — so kids take ownership, parents stay aligned, and coaches gain visibility without chasing players.
                </p>
              </div>

              <div className="mt-8">
                <Button
                  variant="outline"
                  size="lg"
                  className="text-base px-8 border-2 border-primary text-primary hover:bg-primary/5 transition-colors rounded-xl"
                  asChild
                >
                  <Link to="/about">
                    Learn More About Jon
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Anchor Section */}
      <section className="py-20 lg:py-28 bg-[hsl(0,0%,96%)]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-card rounded-2xl p-8 md:p-12 border border-border shadow-subtle text-center">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium mb-6">
              <DollarSign className="w-4 h-4" />
              Simple Pricing
            </div>
            
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-foreground">
              Less than one private lesson.
            </h2>
            <p className="text-lg text-text-secondary mb-8 max-w-xl mx-auto">
              For $15/month, your child gets:
            </p>
            
            <div className="grid sm:grid-cols-2 gap-4 max-w-md mx-auto mb-8">
              {[
                "Structured weekly training",
                "Built-in accountability",
                "Progress tracking",
                "Full parent visibility",
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 text-left">
                  <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                  <span className="text-sm font-medium">{item}</span>
                </div>
              ))}
            </div>

            <p className="text-sm text-text-muted">
              Get started free. Teams can cover families. Otherwise parents can upgrade after a 7-day trial.
            </p>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 lg:py-28 bg-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
          <div className="bg-card rounded-2xl p-8 md:p-12 border border-border shadow-subtle">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 text-foreground">
              Start building consistent habits at home.
            </h2>
            <p className="text-lg text-text-secondary mb-10 max-w-2xl mx-auto">
              Give your child the structure to train on their own. See the difference in one week.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                className="text-base px-10 bg-primary hover:bg-[hsl(22,85%,40%)] transition-colors text-white rounded-xl shadow-[0_6px_20px_rgba(0,0,0,0.08)]"
                onClick={() => setShowGetStarted(true)}
              >
                Get Started For Free
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="text-base px-8 border-2 border-primary text-primary hover:bg-primary/5 transition-colors rounded-xl"
                asChild
              >
                <Link to="/demo">
                  See How It Works
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <MarketingFooter />

      {/* GetStarted Modal */}
      <GetStartedModal open={showGetStarted} onOpenChange={setShowGetStarted} />
    </div>
  );
};

export default Home;
