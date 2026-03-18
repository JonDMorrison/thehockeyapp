import React from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { useAuth } from "@/hooks/useAuth";

const Terms: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>Terms of Service — The Hockey App</title>
        <meta name="description" content="Terms and conditions for using The Hockey App." />
        <meta property="og:title" content="Terms of Service — The Hockey App" />
        <meta property="og:description" content="Terms and conditions for using The Hockey App." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://hockeyapp.ca/terms" />
      </Helmet>
      {/* Sticky back bar */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <button
            onClick={() => isAuthenticated ? navigate("/settings") : navigate("/")}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground group"
          >
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            {isAuthenticated ? "Back to Settings" : "Back to home"}
          </button>
        </div>
      </div>

      <MarketingNav />

      <main className="flex-1 pt-8 pb-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">

          <h1 className="text-4xl font-bold mb-6">Terms of Service</h1>
          <p className="text-sm text-muted-foreground mb-8">Last updated: January 2026</p>
          
          <div className="prose prose-gray dark:prose-invert max-w-none space-y-6">
            <section>
              <h2 className="text-2xl font-semibold mb-4">Agreement to Terms</h2>
              <p className="text-muted-foreground">
                By accessing or using The Hockey App, you agree to be bound by these Terms of Service. 
                If you disagree with any part of these terms, you may not access the service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Use of Service</h2>
              <p className="text-muted-foreground">
                The Hockey App is designed for hockey coaches, players, and their families to track 
                off-ice training activities. You agree to use the service only for its intended purpose 
                and in compliance with all applicable laws.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">User Accounts</h2>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>You are responsible for maintaining the security of your account</li>
                <li>You must provide accurate and complete information when creating an account</li>
                <li>Parents/guardians are responsible for managing their child's profile</li>
                <li>You may not share your account credentials with others</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Content Guidelines</h2>
              <p className="text-muted-foreground">
                Users are responsible for content they upload. You may not upload content that is 
                inappropriate, offensive, or violates the rights of others. We reserve the right to 
                remove any content that violates these guidelines.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Service Availability</h2>
              <p className="text-muted-foreground">
                We strive to maintain high availability but do not guarantee uninterrupted access. 
                We may modify, suspend, or discontinue the service at any time with reasonable notice.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Limitation of Liability</h2>
              <p className="text-muted-foreground">
                The Hockey App is provided "as is" without warranties of any kind. We shall not be liable 
                for any indirect, incidental, or consequential damages arising from your use of the service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Changes to Terms</h2>
              <p className="text-muted-foreground">
                We may update these terms from time to time. Continued use of the service after changes 
                constitutes acceptance of the new terms.
              </p>
            </section>
          </div>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
};

export default Terms;
