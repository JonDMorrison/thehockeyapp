import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

export const MarketingNav: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/features", label: "Features" },
    { href: "/demo", label: "Demo" },
  ];

  const isActive = (href: string) => location.pathname === href;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-800/50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-[hsl(var(--gradient-end))] flex items-center justify-center shadow-soft group-hover:shadow-glow transition-shadow">
              <span className="text-white font-bold text-sm">HA</span>
            </div>
            <div className="hidden sm:flex flex-col">
              <span className="font-bold text-xl bg-gradient-to-r from-[hsl(var(--gradient-start))] via-[hsl(var(--gradient-mid))] to-[hsl(var(--gradient-end))] bg-clip-text text-transparent leading-tight">
                The Hockey App
              </span>
              <span className="text-[10px] text-muted-foreground -mt-0.5">Off-Ice Training</span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={cn(
                  "text-sm font-medium transition-colors relative",
                  isActive(link.href)
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                  "after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-primary after:scale-x-0 after:origin-right after:transition-transform hover:after:scale-x-100 hover:after:origin-left"
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Button variant="ghost" className="text-sm" asChild>
              <Link to="/auth">Sign in</Link>
            </Button>
            <Button 
              className="text-sm bg-gradient-to-r from-primary to-[hsl(var(--gradient-end))] hover:opacity-90 transition-opacity shadow-soft hover:shadow-glow" 
              asChild
            >
              <Link to="/auth">Get Started</Link>
            </Button>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border/50 bg-white/95 dark:bg-gray-950/95 backdrop-blur-xl">
          <div className="px-4 py-4 space-y-3">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "block py-2.5 text-base font-medium rounded-lg px-3 transition-colors",
                  isActive(link.href)
                    ? "text-foreground bg-muted"
                    : "text-muted-foreground hover:bg-muted/50"
                )}
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-4 flex flex-col gap-2">
              <Button variant="outline" asChild className="w-full">
                <Link to="/auth">Sign in</Link>
              </Button>
              <Button 
                className="w-full bg-gradient-to-r from-primary to-[hsl(var(--gradient-end))]" 
                asChild
              >
                <Link to="/auth">Get Started</Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};
