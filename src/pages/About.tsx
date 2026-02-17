import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { Button } from "@/components/ui/button";
import founderImg from "@/assets/founder-about-headshot.png";


const About: React.FC = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <MarketingNav />

      {/* Hero */}
      <section className="relative pt-16 bg-[hsl(0,0%,98%)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-[60px] pb-20 lg:pb-28">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="text-center lg:text-left">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6 leading-[1.08] text-foreground">
                Hockey is a leadership laboratory.
              </h1>
              <p className="text-lg text-muted-foreground leading-relaxed mb-8 max-w-xl mx-auto lg:mx-0">
                From junior hockey in the BCHL to coaching three daughters and multiple minor hockey teams, Jon Morrison builds athletes through structure, discipline, and long-term development.
              </p>
              <Button
                size="lg"
                className="text-base px-10 bg-primary hover:bg-[hsl(22,85%,40%)] transition-colors text-white rounded-xl shadow-[0_6px_20px_rgba(0,0,0,0.08)]"
                asChild
              >
                <Link to="/demo">
                  See How The Hockey App Works
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </div>

            <div className="flex justify-center lg:justify-end">
              <div className="rounded-2xl overflow-hidden shadow-subtle max-w-md w-full">
                <img
                  src={founderImg}
                  alt="Jon Morrison coaching youth hockey"
                  className="w-full h-auto object-cover aspect-[4/5]"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Story */}
      <section className="py-20 lg:py-28 bg-background">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-6 text-base text-muted-foreground leading-relaxed">
            <h2 className="text-2xl font-bold text-foreground">Where It Started</h2>
            <p>
              I grew up in the rink. I played junior hockey in the BCHL, lived in billets, trained year-round, and learned what it meant to be accountable to a team before I was old enough to vote.
            </p>
            <p>
              Hockey taught me structure. It taught me that talent matters less than consistency. And it taught me that the players who develop the fastest are the ones who do the quiet work: the unglamorous reps at home, in the garage, in the basement, when nobody is watching.
            </p>

            <h2 className="text-2xl font-bold text-foreground pt-4">The Pattern I Kept Seeing</h2>
            <p>
              Years later, I became a coach. I've coached Abbotsford Hawks U7, U9, and U11. I've worked with Fraser Valley Kings development groups and been part of the BC Stars development environment. I've coached dozens of kids across multiple age groups.
            </p>
            <p>
              And I kept seeing the same pattern:
            </p>
            <p>
              Coaches would assign off-ice training. Parents would try to make it happen. Kids would resist. And every night, the same argument would play out in kitchens across the country: "Did you do your training?"
            </p>
            <p>
              The problem was never the kid's commitment. It was the lack of structure. There was no system. No clear plan. No way for the child to own it themselves.
            </p>

            <h2 className="text-2xl font-bold text-foreground pt-4">Three Daughters in the Game</h2>
            <p>
              I'm also a hockey dad. I have three daughters who play. I've lived the exact tension I'm describing: trying to support without pushing, trying to encourage without nagging, trying to build discipline without creating resentment.
            </p>
            <p>
              That's the hardest part of being a hockey parent: you care deeply, but if you push too hard, your child pulls away.
            </p>

            <h2 className="text-2xl font-bold text-foreground pt-4">Why I Built This</h2>
            <p>
              The Hockey App exists because I needed it. As a coach, I needed a way to give families clear weekly plans without creating more work for parents. As a dad, I needed a system my daughters could follow on their own so training happened without me standing over them.
            </p>
            <p>
              This isn't a tech company's idea of what hockey needs. It's a coach and father's answer to a problem I've lived with for over a decade.
            </p>

            <h2 className="text-2xl font-bold text-foreground pt-4">What It Does</h2>
            <p>
              The Hockey App gives coaches a simple way to assign structured off-ice training. Kids open the app, see their tasks for the day, and check them off. Parents get visibility without having to manage anything. Everyone stays aligned.
            </p>
            <p>
              No rankings. No pressure. No public leaderboards. Just quiet consistency, the kind that builds real athletes.
            </p>

            <h2 className="text-2xl font-bold text-foreground pt-4">The Philosophy</h2>
            <p>
              I believe development happens through daily habits, not occasional intensity. I believe kids are more capable than we think, if we give them the structure to succeed. And I believe parents deserve to step back from being the enforcer and just be the supporter.
            </p>
            <p>
              The Hockey App is designed around these beliefs. It's calm. It's structured. And it works because it removes friction instead of adding it.
            </p>
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="py-20 lg:py-28 bg-background">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6 text-foreground">
            Development Over Ego.{" "}
            <span className="text-primary">Structure Over Chaos.</span>
          </h2>
          <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
            The Hockey App was built from real experience: as a player, as a coach, and as a father. It exists to align families, coaches, and players around one goal: consistent, disciplined development.
          </p>
          <Button
            size="lg"
            className="text-base px-10 bg-primary hover:bg-[hsl(22,85%,40%)] transition-colors text-white rounded-xl shadow-[0_6px_20px_rgba(0,0,0,0.08)]"
            asChild
          >
            <Link to="/auth">Get Started For Free</Link>
          </Button>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
};

export default About;
