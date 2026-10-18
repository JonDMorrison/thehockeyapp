import { SampleShootingChallenge } from "@/components/marketing/SampleShootingChallenge";
import { Link } from "react-router-dom";
import { SampleWorkout } from "@/components/marketing/SampleWorkout";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingSkillVideoShowcase } from "@/components/marketing/MarketingSkillVideoShowcase";

export default function Demo() {
  return (
    <div className="marketing-performance min-h-screen bg-background">
      <MarketingNav />
      <main className="pt-16">
        <header className="mx-auto max-w-3xl px-4 py-6 sm:py-10">
          <h1 className="text-3xl font-bold sm:text-4xl">
            Try it. Find your team’s next win.
          </h1>
          <p className="mt-3 text-lg text-muted-foreground">
            Run a shooting challenge or try a workout. No account needed.
          </p>
          <nav aria-label="Choose a demo" className="mt-5 flex flex-wrap gap-3">
            <Link
              className="inline-flex min-h-11 items-center rounded-md bg-primary px-5 text-sm font-bold text-primary-foreground"
              to="/demo#shooting-challenge"
            >
              Try the shooting challenge
            </Link>
            <Link
              className="inline-flex min-h-11 items-center rounded-md border border-border px-5 text-sm font-bold"
              to="/demo#sample-workout"
            >
              Try the workout checklist
            </Link>
          </nav>
        </header>
        <SampleShootingChallenge />
        <SampleWorkout />
        <section
          aria-labelledby="after-sample-heading"
          className="mx-auto max-w-3xl px-4 py-12"
        >
          <h2 id="after-sample-heading" className="text-2xl font-bold">
            What happens with your real team?
          </h2>
          <ol className="mt-6 grid gap-5 sm:grid-cols-3">
            <li>
              <h3 className="font-bold">1. Coach sets the plan</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Create a team, share a private invite, and start a shooting
                challenge or assign your first workout. Templates and longer
                plans are there when you need them.
              </p>
            </li>
            <li>
              <h3 className="font-bold">2. Family joins once</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                A parent uses the coach’s code and creates or selects their
                child’s profile. The same adult account can also coach a team.
              </p>
            </li>
            <li>
              <h3 className="font-bold">3. Player builds a habit</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Open today’s work, follow the instructions, and check off
                completed exercises. Families and coaches can see progress.
              </p>
            </li>
          </ol>
          <div className="mt-8 space-y-3">
            <details className="rounded-xl border border-border p-4">
              <summary className="min-h-11 cursor-pointer font-semibold">
                Does my child need their own email or phone?
              </summary>
              <p className="mt-2 leading-6 text-muted-foreground">
                An adult manages the child’s profile. You can open their workout
                from your family account on a shared device.
              </p>
            </details>
            <details className="rounded-xl border border-border p-4">
              <summary className="min-h-11 cursor-pointer font-semibold">
                Can we start without a team?
              </summary>
              <p className="mt-2 leading-6 text-muted-foreground">
                Yes. Choose “Start for my child” to set up an individual
                routine. If your coach sent an invitation, use{" "}
                <Link className="text-primary underline" to="/join">
                  Join a team
                </Link>{" "}
                instead.
              </p>
            </details>
            <details className="rounded-xl border border-border p-4">
              <summary className="min-h-11 cursor-pointer font-semibold">
                What does it cost?
              </summary>
              <p className="mt-2 leading-6 text-muted-foreground">
                The Hockey App is free for the hockey community, with all
                features unlocked and no credit card required.
              </p>
            </details>
            <details className="rounded-xl border border-border p-4">
              <summary className="min-h-11 cursor-pointer font-semibold">
                Who can see my child’s information?
              </summary>
              <p className="mt-2 leading-6 text-muted-foreground">
                Teams are invite-only and player profiles are not publicly
                searchable. Guardians manage profiles, and authorized team staff
                can access team information. Read the{" "}
                <Link className="text-primary underline" to="/privacy">
                  Privacy Policy
                </Link>{" "}
                for details.
              </p>
            </details>
          </div>
        </section>
        <MarketingSkillVideoShowcase />
      </main>
      <MarketingFooter />
    </div>
  );
}
