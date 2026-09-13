import React, { useState } from "react";
import { Helmet } from "react-helmet-async";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/app/Toast";
import { CheckCircle, Loader2 } from "lucide-react";

const Contact: React.FC = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (website) return;
    if (!name.trim() || !email.trim() || !message.trim()) return;

    setSubmitting(true);
    const { error } = await supabase.from("contact_submissions").insert({
      name: name.trim().slice(0, 100),
      email: email.trim().slice(0, 255),
      message: message.trim().slice(0, 4000),
    });
    setSubmitting(false);

    if (error) {
      toast.error("Message not sent", "Please try again in a moment.");
      return;
    }
    setSubmitted(true);
  };

  return (
    <div className="marketing-performance min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>Contact — The Hockey App</title>
        <meta name="description" content="Contact The Hockey App for product support or a privacy request." />
        <link rel="canonical" href="https://www.hockeyapp.ca/contact" />
      </Helmet>
      <MarketingNav />
      <main className="flex-1 pt-28 pb-20 px-4">
        <div className="max-w-xl mx-auto">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary mb-3">Support</p>
          <h1 className="text-4xl font-bold mb-4">Talk to a real person.</h1>
          <p className="text-muted-foreground mb-8">
            Ask a product question, report a problem, request an association pilot, or submit a privacy request.
          </p>

          {submitted ? (
            <div className="rounded-2xl border border-success/30 bg-success/10 p-8 text-center">
              <CheckCircle className="w-10 h-10 text-success mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">Message received</h2>
              <p className="text-muted-foreground">We’ll use the email you provided to follow up.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="contact-name">Name</Label>
                <Input id="contact-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} required autoComplete="name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-email">Email</Label>
                <Input id="contact-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={255} required autoComplete="email" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-message">How can we help?</Label>
                <Textarea id="contact-message" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={4000} rows={7} required />
              </div>
              <div className="absolute -left-[9999px]" aria-hidden="true">
                <Label htmlFor="contact-website">Website</Label>
                <Input id="contact-website" value={website} onChange={(e) => setWebsite(e.target.value)} tabIndex={-1} autoComplete="off" />
              </div>
              <Button type="submit" size="lg" className="w-full" disabled={submitting}>
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Send message
              </Button>
            </form>
          )}
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
};

export default Contact;
