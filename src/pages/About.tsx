import React from "react";
import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";

const About: React.FC = () => {
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
            <p className="text-muted-foreground">
              Have questions or feedback? We'd love to hear from you. 
              Reach out to our team and we'll get back to you as soon as possible.
            </p>
          </div>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
};

export default About;
