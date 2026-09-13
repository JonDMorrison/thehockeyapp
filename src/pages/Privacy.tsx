import React from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";

const Privacy: React.FC = () => {
  return (
    <div className="marketing-performance min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>Privacy Policy — The Hockey App</title>
        <meta name="description" content="How The Hockey App handles your data." />
        <meta property="og:title" content="Privacy Policy — The Hockey App" />
        <meta property="og:description" content="How The Hockey App handles your data." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://hockeyapp.ca/privacy" />
        <meta property="og:image" content="https://www.hockeyapp.ca/SitePreview.png" />
      </Helmet>
      <MarketingNav />

      <main className="flex-1 pt-28 pb-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">

          <h1 className="text-4xl font-bold mb-6">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground mb-8">Last updated: September 12, 2026</p>
          
          <div className="prose prose-gray dark:prose-invert max-w-none space-y-6">
            <section>
              <h2 className="text-2xl font-semibold mb-4">Overview</h2>
              <p className="text-muted-foreground">
                The Hockey App is an off-ice hockey training service for coaches, adult players, and families.
                This policy explains what information the service uses and the choices available to account holders.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Children and Adult-Managed Accounts</h2>
              <p className="text-muted-foreground">
                A parent or legal guardian must create and manage a profile for a player under 13. Coaches invite
                families to connect their own players; a coach does not receive guardian rights merely by adding a
                team. Children under 13 should not create their own accounts or submit information directly. If you
                believe a child has provided information without appropriate guardian involvement, contact us so we
                can review and remove it.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Information We Collect</h2>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Account information (email, name) for parents and coaches</li>
                <li>Player profiles (first name, birth year, jersey number) managed by parents</li>
                <li>Training activity and completion data</li>
                <li>Photos that an account holder chooses to upload</li>
                <li>Team and calendar information, including a private calendar-subscription URL when schedule sync is enabled</li>
                <li>Billing status from our payment provider; we do not store full card numbers</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">How We Use Information</h2>
              <p className="text-muted-foreground">
                We use this information to operate the service, show training plans and progress, sync schedules,
                provide account and service messages, prevent abuse, and support users. We do not sell or rent
                personal information or share it with third parties for their own marketing.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Service Providers and Data Location</h2>
              <p className="text-muted-foreground">
                We use service providers for hosting, authentication and database services, email delivery,
                payments, and optional AI-assisted workout and summary generation. Information may be processed
                in the United States and other locations where those providers operate. These providers receive only
                the information needed to perform their service for us.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Data Security</h2>
              <p className="text-muted-foreground">
                We use access controls, encrypted network connections, managed authentication, and restricted
                database permissions to protect information. No online service can guarantee absolute security.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Access, Correction, Deletion, and Retention</h2>
              <p className="text-muted-foreground">
                Account holders may ask to access, correct, or delete personal information associated with their
                account or a player profile they manage. We retain information while it is needed to provide the
                service and for legitimate security, legal, and backup purposes, then delete or de-identify it.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Contact Us</h2>
              <p className="text-muted-foreground">
                If you have questions about this Privacy Policy or wish to exercise your rights regarding
                your data — including requests to review, correct, or delete a player profile — submit a privacy
                request through our contact form. Include the email address used for your account so we can verify
                the request.
              </p>
              <p className="text-muted-foreground mt-2">
                <Link to="/contact" className="text-primary hover:underline">Submit a privacy request</Link>
              </p>
            </section>
          </div>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
};

export default Privacy;
