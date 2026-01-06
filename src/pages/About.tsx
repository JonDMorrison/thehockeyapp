import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, Send, Loader2, CheckCircle } from "lucide-react";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const About: React.FC = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !email.trim() || !message.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsSubmitting(true);
    
    const { error } = await supabase
      .from("contact_submissions")
      .insert({ name: name.trim(), email: email.trim(), message: message.trim() });

    setIsSubmitting(false);

    if (error) {
      toast.error("Failed to submit. Please try again.");
      return;
    }

    setIsSubmitted(true);
    toast.success("Message sent! We'll get back to you soon.");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <MarketingNav />
      
      <main className="flex-1 pt-24 pb-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link 
            to="/" 
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8 group"
          >
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            Back to home
          </Link>

          <h1 className="text-4xl font-bold mb-6">About The Hockey App</h1>
          
          <div className="prose prose-gray dark:prose-invert max-w-none">
            <p className="text-lg text-muted-foreground mb-6">
              The Hockey App was built by hockey parents who wanted a better way to help their kids 
              develop off the ice.
            </p>
            
            <h2 className="text-2xl font-semibold mt-8 mb-4">Our Mission</h2>
            <p className="text-muted-foreground mb-4">
              We believe that consistent off-ice training is key to developing well-rounded hockey players. 
              Our mission is to make it easy for coaches to assign training, for kids to complete it, 
              and for parents to stay informed—all while keeping youth privacy at the forefront.
            </p>
            
            <h2 className="text-2xl font-semibold mt-8 mb-4">Privacy First</h2>
            <p className="text-muted-foreground mb-4">
              We're COPPA compliant and take youth privacy seriously. Parents maintain full control 
              over their child's data, and we never sell or share personal information with third parties.
            </p>
            
            <h2 className="text-2xl font-semibold mt-8 mb-4">Contact Us</h2>
            <p className="text-muted-foreground mb-6">
              Have questions or feedback? We'd love to hear from you.
            </p>

            {isSubmitted ? (
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-6 flex items-center gap-4">
                <CheckCircle className="w-8 h-8 text-primary flex-shrink-0" />
                <div>
                  <p className="font-medium text-foreground">Thank you for reaching out!</p>
                  <p className="text-sm text-muted-foreground">We'll review your message and get back to you soon.</p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 not-prose">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      placeholder="Your name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    placeholder="Your question or feedback..."
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
                <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send Message
                    </>
                  )}
                </Button>
              </form>
            )}
          </div>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
};

export default About;
