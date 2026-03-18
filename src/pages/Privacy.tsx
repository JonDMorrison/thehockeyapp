import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { useAuth } from "@/hooks/useAuth";

const Privacy: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-background flex flex-col">
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

          <h1 className="text-4xl font-bold mb-6">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground mb-8">Last updated: January 2026</p>
          
          <div className="prose prose-gray dark:prose-invert max-w-none space-y-6">
            <section>
              <h2 className="text-2xl font-semibold mb-4">Overview</h2>
              <p className="text-muted-foreground">
                The Hockey App ("we", "our", or "us") is committed to protecting the privacy of our users, 
                especially children under 13. This Privacy Policy explains how we collect, use, and safeguard 
                your information.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">COPPA Compliance</h2>
              <p className="text-muted-foreground">
                We comply with the Children's Online Privacy Protection Act (COPPA). We do not knowingly 
                collect personal information from children under 13 without verifiable parental consent. 
                Parents can review, delete, or refuse further collection of their child's information at any time.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Information We Collect</h2>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Account information (email, name) for parents and coaches</li>
                <li>Player profiles (first name, birth year, jersey number) managed by parents</li>
                <li>Training activity and completion data</li>
                <li>Photos uploaded by users (with parental consent)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">How We Use Information</h2>
              <p className="text-muted-foreground">
                We use collected information solely to provide our training tracking services. 
                We do not sell, rent, or share personal information with third parties for marketing purposes.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Data Security</h2>
              <p className="text-muted-foreground">
                We implement industry-standard security measures to protect your data, including encryption 
                in transit and at rest, secure authentication, and regular security audits.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Contact Us</h2>
              <p className="text-muted-foreground">
                If you have questions about this Privacy Policy or wish to exercise your rights regarding
                your data — including requests to review, delete, or restrict processing of your child's
                personal information under COPPA — please contact us:
              </p>
              <p className="text-muted-foreground mt-2">
                <strong>Email:</strong>{" "}
                <a href="mailto:privacy@thehockeyapp.com" className="text-primary hover:underline">
                  privacy@thehockeyapp.com
                </a>
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
