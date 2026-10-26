import React, { useState } from "react";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/app/Toast";
import { CheckCircle, Loader2 } from "lucide-react";
import { z } from "zod";
import { RequiredMark } from "@/components/ui/required-mark";
import { focusFirstInvalidField, getZodFieldErrors } from "@/lib/formValidation";

const topics = [
  ["App help", "Tell us what you’re trying to do and where you got stuck."],
  ["Account or sign-in", "Describe the sign-in or account problem. Never include passwords or access codes."],
  ["Team or association setup", "Include your team or association name and what you need help setting up."],
  ["Shooting totals or badges", "Include the practice date, expected total or badge, and what the app shows."],
  ["Billing or subscription", "Describe the charge or subscription question. Don’t include card details."],
  ["Report a bug", "What happened? What did you expect? Include steps to reproduce it and your device/browser."],
  ["Feature request", "What would you like to do? Tell us how it would help your team or family."],
  ["Sponsorship", "Tell us about your organization, who you’d like to support, and your sponsorship idea."],
  ["Partnership", "Tell us about your organization and how we could work together."],
  ["Privacy or data request", "Tell us whether you need access, a correction, deletion, or other privacy help. Avoid sensitive player details."],
  ["Safety or inappropriate content", "Describe the concern and where it appears. This form is not monitored for emergencies."],
  ["General enquiry", "Share your question, feedback, or media enquiry."],
] as const;

const contactSchema = z.object({
  name: z.string().trim().min(1, "Enter your name").max(100, "Name must be 100 characters or less"),
  email: z.string().trim().min(1, "Enter your email address").email("Enter a valid email address").max(255, "Email must be 255 characters or less"),
  message: z.string().trim().min(1, "Tell us how we can help").max(3800, "Message must be 3,800 characters or less"),
});

const Contact: React.FC = () => {
  const [topic, setTopic] = useState<string>(topics[0][0]);
  const topicHelp = topics.find(([label]) => label === topic)?.[1];
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (website) return;
    const result = contactSchema.safeParse({ name, email, message });
    if (!result.success) {
      const fieldErrors = getZodFieldErrors(result.error);
      setErrors(fieldErrors);
      focusFirstInvalidField(fieldErrors, {
        name: "contact-name",
        email: "contact-email",
        message: "contact-message",
      });
      return;
    }
    setErrors({});

    setSubmitting(true);
    const { error } = await supabase.from("contact_submissions").insert({
      name: result.data.name,
      email: result.data.email,
      message: `[${topic}]\n\n${result.data.message}`,
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
      <MarketingNav />
      <main className="flex-1 pt-28 pb-20 px-4">
        <div className="max-w-xl mx-auto">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary mb-3">Support</p>
          <h1 className="text-4xl font-bold mb-4">Talk to a real person.</h1>
          <p className="text-muted-foreground mb-8">
            Get help, share an idea, or talk to us about sponsoring or partnering with The Hockey App.
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
                <Label htmlFor="contact-topic">What brings you here?</Label>
                <select id="contact-topic" value={topic} onChange={(e) => setTopic(e.target.value)} className="flex min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base" aria-describedby="contact-topic-help">
                  {topics.map(([label]) => <option key={label} value={label}>{label}</option>)}
                </select>
                <p id="contact-topic-help" className="text-sm text-muted-foreground">{topicHelp}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-name">Name<RequiredMark /></Label>
                <Input
                  id="contact-name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setErrors((current) => ({ ...current, name: "" }));
                  }}
                  maxLength={100}
                  autoComplete="name"
                  aria-invalid={Boolean(errors.name)}
                  aria-describedby={errors.name ? "contact-name-error" : undefined}
                />
                {errors.name && <p id="contact-name-error" role="alert" className="text-sm text-destructive">{errors.name}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-email">Email<RequiredMark /></Label>
                <Input
                  id="contact-email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setErrors((current) => ({ ...current, email: "" }));
                  }}
                  maxLength={255}
                  autoComplete="email"
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? "contact-email-error" : undefined}
                />
                {errors.email && <p id="contact-email-error" role="alert" className="text-sm text-destructive">{errors.email}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-message">How can we help?<RequiredMark /></Label>
                <Textarea
                  id="contact-message"
                  value={message}
                  onChange={(e) => {
                    setMessage(e.target.value);
                    setErrors((current) => ({ ...current, message: "" }));
                  }}
                  maxLength={3800}
                  rows={7}
                  aria-invalid={Boolean(errors.message)}
                  aria-describedby={errors.message ? "contact-message-error" : undefined}
                />
                {errors.message && <p id="contact-message-error" role="alert" className="text-sm text-destructive">{errors.message}</p>}
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
