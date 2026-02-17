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
  ClipboardCheck,
  DollarSign,
} from "lucide-react";
import familyNexlevelImg from "@/assets/family-nexlevel.png";

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
                <span className="bg-gradient-to-r from-[hsl(var(--gradient-start))] to-[hsl(var(--gradient-end))] bg-clip-text text-transparent">
                  for hockey families.
                </span>
              </h1>

              <p className="text-xl text-text-secondary font-medium mb-4 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                Kids follow the plan on their own. Parents step back from enforcer to supporter. Coaches stay aligned. Real progress happens.
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
              "Did you do your training?"
            </h2>
            
            <div className="space-y-8 max-w-2xl mx-auto">
              <div className="space-y-5 text-lg text-text-secondary">
                <p>Coaches assign off-ice training. Parents try to make it happen. Kids resist. And every night, the same argument plays out in kitchens across the country.</p>
                <p>The problem was never the kid's commitment. It was the lack of structure. No system. No clear plan. No way for the child to own it themselves.</p>
              </div>
              <p className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-[hsl(var(--gradient-start))] to-[hsl(var(--gradient-end))] bg-clip-text text-transparent">
                The Hockey App gives every family that system.
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
              What The Hockey App does
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Coaches know that what happens off the ice matters just as much as what happens on it. But you're already stretched thin. You need a tool that makes home training easy, fun, and automatic.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            {[
              {
                icon: ClipboardCheck,
                title: "Structure without the stress",
                description: "Set it up once and your players have a clear weekly plan they can follow on their own. No chasing families. No spreadsheets. Just a routine that builds real habits.",
              },
              {
                icon: Shield,
                title: "Visibility without overreach",
                description: "Coaches see who's putting in the work without micromanaging. Parents stay informed. Players own their progress. Everyone aligned, nobody overstepping.",
              },
              {
                icon: Trophy,
                title: "Progress without pressure",
                description: "Effort-based milestones and streaks reward consistency, not talent. Kids build confidence by showing up, not by competing against teammates.",
              },
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
                  <item.icon className="w-8 h-8 text-primary" strokeWidth={1.5} />
                </div>
                
                <h3 className="text-xl font-bold mb-3 text-foreground">{item.title}</h3>
                <p className="text-muted-foreground leading-relaxed max-w-xs mx-auto">{item.description}</p>
              </div>
            ))}
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
                description: "Garages, basements, rinks with no signal. Tasks sync when you're back online.",
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
                description: "Effort-based rewards for consistency. No leaderboards or comparisons. Just personal progress.",
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
      <section className="py-20 lg:py-28 bg-[hsl(0,0%,96%)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div className="relative flex justify-center">
              <div className="max-w-md w-full">
                <img
                  src={familyNexlevelImg}
                  alt="Jon Morrison with his three daughters in hockey gear"
                  className="w-full h-auto object-cover"
                />
              </div>
            </div>

            <div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6 text-foreground">
                Built by a hockey dad{" "}
                <span className="bg-gradient-to-r from-[hsl(var(--gradient-start))] to-[hsl(var(--gradient-end))] bg-clip-text text-transparent">who loves coaching, too.</span>
              </h2>

              <div className="space-y-4 text-base text-muted-foreground leading-relaxed">
                <p>
                  I'm Jon. I coach minor hockey and I have three kids who play. I've worked with players who have gone on to succeed at every level of the game, and I've seen firsthand what separates those who make it: consistent work at home, not just talent on the ice.
                </p>
                <p>
                  But I also lived the reality of being a busy coach and parent. The nightly argument: "Did you do your training?" Players showing up without putting in any work between practices. I realized the problem wasn't motivation. It was that nobody had a system that made it easy and fun to stay on track.
                </p>
                <p>
                  So I built one. The Hockey App gives kids a clear plan they can follow on their own. It gives coaches visibility into who's putting in the work, without adding to their already full plate. And it gives families structure without the stress.
                </p>
                <p>
                  As parents, the last thing we want is to pile on more pressure. But when training feels fun, rewarding, and even social, kids actually want to do it. That's when real growth happens, not because someone is forcing it, but because they're excited to show up.
                </p>
                <p className="text-lg font-semibold text-foreground">
                  I built this because I needed it for my own family, and for my own team.
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
                    Read the Full Story
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* App Screenshot Section */}
      <section className="py-20 lg:py-28 bg-[hsl(0,0%,96%)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="text-center lg:text-left">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6 text-foreground">
                No more{" "}
                <span className="bg-gradient-to-r from-[hsl(var(--gradient-start))] to-[hsl(var(--gradient-end))] bg-clip-text text-transparent">
                  "did you do your training?"
                </span>
              </h2>
              <p className="text-lg text-text-secondary leading-relaxed mb-8 max-w-lg">
                Your child opens the app, sees today's plan, and checks it off themselves. You stop being the enforcer and start being the supporter. That's the shift.
              </p>
              <div className="space-y-4">
                {[
                  "A daily checklist kids actually follow on their own",
                  "Effort-based streaks that build real confidence",
                  "Coaches see progress without chasing families",
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                    <span className="text-base font-medium text-foreground">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-center lg:justify-end">
              <PhoneMockup showGlow={false} className="w-72 lg:w-80">
                <MarketingAppPreview />
              </PhoneMockup>
            </div>
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
