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
      <section className="relative pt-16 bg-[hsl(0,0%,98%)] overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-20 -left-32 w-96 h-96 rounded-full bg-primary/[0.04] blur-3xl" />
        <div className="absolute bottom-0 -right-24 w-80 h-80 rounded-full bg-[hsl(213,100%,25%,0.04)] blur-3xl" />
        <div className="absolute top-40 right-16 w-3 h-3 rounded-full bg-primary/20 hidden lg:block" />
        <div className="absolute top-60 right-32 w-2 h-2 rounded-full bg-primary/15 hidden lg:block" />
        <div className="absolute bottom-32 left-20 w-2 h-2 rounded-full bg-[hsl(213,100%,25%,0.15)] hidden lg:block" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-[60px] pb-20 lg:pb-32 relative z-10">
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
      <section className="relative py-20 lg:py-28 bg-[hsl(0,0%,96%)] overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, hsl(0 0% 12%) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="bg-card rounded-2xl p-8 md:p-12 border border-border shadow-subtle">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-10 text-foreground">
              "Did you do your training?"
            </h2>
            
            <div className="space-y-8 max-w-2xl mx-auto">
              <div className="space-y-5 text-lg text-text-secondary">
                <p>You remind them once. Then twice. Then it turns into a fight. By the time they finally do it, nobody feels good about it.</p>
                <p>It's not that your kid doesn't care. They just don't have a system that lets them own it. No clear plan. No structure. No way to feel proud of what they're doing without you standing over them.</p>
              </div>
              <p className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-[hsl(var(--gradient-start))] to-[hsl(var(--gradient-end))] bg-clip-text text-transparent">
                The Hockey App gives every family that system.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="relative py-20 lg:py-28 bg-background overflow-hidden">
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-primary/[0.03] blur-2xl" />
        <div className="absolute bottom-0 -left-20 w-72 h-72 rounded-full bg-[hsl(213,100%,25%,0.03)] blur-2xl" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
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

      {/* Features Section */}
      <section className="relative py-20 lg:py-28 bg-[hsl(0,0%,96%)] overflow-hidden">
        <div className="absolute top-20 right-10 w-48 h-48 rounded-full bg-primary/[0.04] blur-2xl hidden lg:block" />
        <div className="absolute bottom-20 left-10 w-56 h-56 rounded-full bg-[hsl(213,100%,25%,0.04)] blur-2xl hidden lg:block" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 text-foreground">
              It works where your kid actually trains.
            </h2>
            <p className="text-lg text-text-secondary max-w-2xl mx-auto">
              In the garage. In the basement. On the driveway before dinner. The Hockey App was built for real life, not ideal conditions.
            </p>
          </div>

          <div className="space-y-6 max-w-4xl mx-auto">
            {/* Top row - two cards */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="relative overflow-hidden rounded-2xl bg-card border border-border p-8 shadow-subtle group hover:shadow-medium transition-all duration-300">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                <Wifi className="w-10 h-10 text-primary mb-5" strokeWidth={1.5} />
                <h3 className="text-xl font-bold mb-3 text-foreground">No Wi-Fi? No problem.</h3>
                <p className="text-base leading-relaxed text-text-secondary">
                  Your kid checks off tasks in the garage, the basement, or a rink with zero signal. Everything syncs the moment they're back online.
                </p>
              </div>

              <div className="relative overflow-hidden rounded-2xl bg-card border border-border p-8 shadow-subtle group hover:shadow-medium transition-all duration-300">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                <Calendar className="w-10 h-10 text-primary mb-5" strokeWidth={1.5} />
                <h3 className="text-xl font-bold mb-3 text-foreground">It knows when to push and when to rest.</h3>
                <p className="text-base leading-relaxed text-text-secondary">
                  Connect your team calendar and the app adjusts automatically. Game day? Light work. Off day? Time to grind. No parent math required.
                </p>
              </div>
            </div>

            {/* Bottom row - full width feature */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="relative overflow-hidden rounded-2xl bg-card border border-border p-8 shadow-subtle group hover:shadow-medium transition-all duration-300">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                <Shield className="w-10 h-10 text-primary mb-5" strokeWidth={1.5} />
                <h3 className="text-xl font-bold mb-3 text-foreground">Your family's data stays yours.</h3>
                <p className="text-base leading-relaxed text-text-secondary">
                  Parents own accounts. Parents decide what coaches can see. Home training is private unless you choose to share it. Full stop.
                </p>
              </div>

              <div className="relative overflow-hidden rounded-2xl bg-card border border-border p-8 shadow-subtle group hover:shadow-medium transition-all duration-300">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                <Trophy className="w-10 h-10 text-primary mb-5" strokeWidth={1.5} />
                <h3 className="text-xl font-bold mb-3 text-foreground">Rewards that actually motivate.</h3>
                <p className="text-base leading-relaxed text-text-secondary">
                  Streaks, milestones, and badges built around showing up, not competing. Your kid builds confidence by being consistent, not by being the best.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Founder Section */}
      <section className="relative py-20 lg:py-28 bg-[hsl(0,0%,96%)] overflow-hidden">
        <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'radial-gradient(circle, hsl(0 0% 12%) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="absolute top-10 left-1/4 w-4 h-4 rounded-full bg-primary/10 hidden lg:block" />
        <div className="absolute bottom-20 right-1/4 w-3 h-3 rounded-full bg-[hsl(213,100%,25%,0.1)] hidden lg:block" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
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
      <section className="relative py-20 lg:py-28 bg-[hsl(0,0%,96%)] overflow-hidden">
        <div className="absolute -top-10 -left-20 w-80 h-80 rounded-full bg-primary/[0.04] blur-3xl" />
        <div className="absolute bottom-10 right-0 w-64 h-64 rounded-full bg-[hsl(213,100%,25%,0.03)] blur-3xl" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
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
      <section className="relative py-20 lg:py-28 bg-background overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full bg-primary/[0.03] blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-4 h-4 rounded-full bg-primary/10 hidden lg:block" />
        <div className="absolute top-10 right-1/3 w-3 h-3 rounded-full bg-[hsl(213,100%,25%,0.1)] hidden lg:block" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
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
