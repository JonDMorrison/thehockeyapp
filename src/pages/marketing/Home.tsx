import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import {
  CheckCircle,
  Shield,
  Heart,
  Zap,
  Users,
  Calendar,
  ArrowRight,
  Star,
} from "lucide-react";
import heroPlayer from "@/assets/hero-player.jpg";
import mockupPlayer from "@/assets/mockup-player-checklist.png";

const Home: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      <MarketingNav />

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                <Star className="w-4 h-4" />
                Trusted by 200+ hockey families
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
                Build better hockey players through{" "}
                <span className="text-primary">consistent practice</span>
              </h1>
              
              <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto lg:mx-0">
                A training platform designed for youth hockey coaches and parents. 
                Daily practice cards, progress tracking, and game day prep—all in one calm, 
                focused app.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Button size="lg" asChild>
                  <Link to="/auth">
                    Start Free Trial
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link to="/demo">See Demo</Link>
                </Button>
              </div>

              <div className="mt-8 flex items-center gap-6 justify-center lg:justify-start text-sm text-muted-foreground">
                <span className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-success" />
                  Free for coaches
                </span>
                <span className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-success" />
                  No credit card
                </span>
              </div>
            </div>

            <div className="relative">
              <div className="relative rounded-2xl overflow-hidden shadow-elevated">
                <img
                  src={heroPlayer}
                  alt="Young hockey player practicing"
                  className="w-full h-auto"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
              </div>
              {/* Floating mockup */}
              <div className="absolute -bottom-8 -left-8 w-48 rounded-2xl shadow-elevated overflow-hidden hidden lg:block">
                <img
                  src={mockupPlayer}
                  alt="App mockup"
                  className="w-full h-auto"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-16 bg-muted/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Built on the right values</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              We believe youth sports should build confidence, not anxiety. 
              Our platform reflects that in every decision we make.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Heart,
                title: "Consistency over pressure",
                description:
                  "Small daily habits beat occasional heroics. We encourage steady progress, not burnout.",
              },
              {
                icon: Shield,
                title: "Privacy by default",
                description:
                  "No public leaderboards. No comparisons between kids. Parent-controlled, always.",
              },
              {
                icon: Users,
                title: "Coach-approved, parent-trusted",
                description:
                  "Coaches set the training. Parents see progress. Kids build skills.",
              },
            ].map((value, i) => (
              <div
                key={i}
                className="bg-background rounded-2xl p-8 shadow-subtle"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <value.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{value.title}</h3>
                <p className="text-muted-foreground">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-16 lg:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Simple for everyone</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Coaches create training plans. Parents track progress. Kids build skills.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                title: "Coach creates the plan",
                description:
                  "Set up your team, define training preferences, and publish daily practice cards.",
              },
              {
                step: "2",
                title: "Parents receive the card",
                description:
                  "Each day, parents see exactly what their player needs to practice. No guessing.",
              },
              {
                step: "3",
                title: "Track and celebrate",
                description:
                  "Mark tasks complete, earn badges, and watch skills grow week over week.",
              },
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                  {item.step}
                </div>
                <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                <p className="text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Preview */}
      <section className="py-16 bg-muted/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6">
                Everything your team needs
              </h2>
              <div className="space-y-4">
                {[
                  {
                    icon: Calendar,
                    title: "Daily practice cards",
                    description: "Simple checklists that players can complete in 15-20 minutes.",
                  },
                  {
                    icon: Zap,
                    title: "Game day mode",
                    description: "Automatic pre-game prep routines when games are detected.",
                  },
                  {
                    icon: Users,
                    title: "Team management",
                    description: "Invite parents, track roster, see team-wide progress.",
                  },
                  {
                    icon: Shield,
                    title: "Privacy controls",
                    description: "Parents control what's visible. No child data exposed.",
                  },
                ].map((feature, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <feature.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">{feature.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <Button className="mt-8" asChild>
                <Link to="/features">
                  See all features
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </div>

            <div className="relative flex justify-center">
              <img
                src={mockupPlayer}
                alt="Player app mockup"
                className="w-64 rounded-3xl shadow-elevated"
              />
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 lg:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6">
            Ready to build better training habits?
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join coaches and parents who are helping their players develop skills 
            through consistent, focused practice.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <Link to="/auth">
                Get Started Free
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/demo">Try the Demo</Link>
            </Button>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
};

export default Home;
