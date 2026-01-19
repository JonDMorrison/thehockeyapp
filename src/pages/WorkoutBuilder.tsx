import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTeamTheme } from "@/hooks/useTeamTheme";
import { AppShell, PageContainer } from "@/components/app/AppShell";
import { AppCard, AppCardTitle, AppCardDescription } from "@/components/app/AppCard";
import { Tag } from "@/components/app/Tag";
import { Avatar } from "@/components/app/Avatar";
import { EmptyState } from "@/components/app/EmptyState";
import { SkeletonCard } from "@/components/app/Skeleton";
import { Button } from "@/components/ui/button";
import { format, parseISO, addDays, startOfWeek } from "date-fns";
import {
  ChevronLeft,
  Plus,
  Calendar,
  Layers,
  ChevronRight,
  FileText,
  CheckCircle,
  Edit,
  Sparkles,
} from "lucide-react";
import { getTierLabel } from "@/lib/tierScaling";
import { AIAssistSheet } from "@/components/builder/AIAssistSheet";
import { TeamWeeklySummaryCard } from "@/components/summary/WeeklySummaryCard";

interface WeekPlan {
  id: string;
  name: string;
  start_date: string;
  tier: string;
  status: string;
  created_at: string;
}

const WorkoutBuilder: React.FC = () => {
  const { id: teamId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { setTeamTheme } = useTeamTheme();
  const [showAIAssist, setShowAIAssist] = useState(false);
  
  const nextWeekStart = format(
    startOfWeek(addDays(new Date(), 7), { weekStartsOn: 1 }),
    "yyyy-MM-dd"
  );

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/auth", { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  // Fetch team
  const { data: team, isLoading: teamLoading } = useQuery({
    queryKey: ["team", teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teams")
        .select("*")
        .eq("id", teamId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user && !!teamId,
  });

  // Fetch week plans
  const { data: weekPlans, isLoading: plansLoading } = useQuery({
    queryKey: ["team-week-plans", teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_week_plans")
        .select("*")
        .eq("team_id", teamId)
        .order("start_date", { ascending: false });

      if (error) throw error;
      return data as WeekPlan[];
    },
    enabled: !!user && !!teamId,
  });

  // Fetch templates
  const { data: templates, isLoading: templatesLoading } = useQuery({
    queryKey: ["workout-templates", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workout_templates")
        .select("*")
        .eq("created_by_user_id", user!.id)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (team?.palette_id) {
      setTeamTheme(team.palette_id);
    }
  }, [team?.palette_id, setTeamTheme]);

  const isLoading = teamLoading || plansLoading || authLoading;

  // Show loading state while auth or data is loading
  if (isLoading) {
    return (
      <AppShell hideNav>
        <PageContainer>
          <SkeletonCard />
          <SkeletonCard />
        </PageContainer>
      </AppShell>
    );
  }

  // If not authenticated, render nothing while redirect happens
  if (!isAuthenticated) {
    return null;
  }

  return (
    <AppShell
      hideNav
      header={
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => navigate(`/teams/${teamId}`)}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold truncate">Workout Builder</h1>
            <p className="text-xs text-text-muted">{team?.name}</p>
          </div>
          {team && (
            <Avatar
              src={team.team_logo_url || team.team_photo_url}
              fallback={team.name}
              size="sm"
            />
          )}
        </div>
      }
    >
      <PageContainer>
        {/* Create New - Simple CTA */}
        <Button
          className="w-full"
          size="lg"
          onClick={() => navigate(`/teams/${teamId}/builder/new`)}
        >
          <Plus className="w-5 h-5 mr-2" />
          Plan Next Week
        </Button>
        
        {/* Team Summary */}
        <TeamWeeklySummaryCard teamId={teamId!} />

        {/* Week Plans */}
        <div>
          <h2 className="text-sm font-semibold text-text-secondary mb-3">
            Week Plans
          </h2>
          
          {!weekPlans || weekPlans.length === 0 ? (
            <AppCard variant="muted">
              <EmptyState
                icon={Calendar}
                title="No week plans yet"
                description="Create your first week plan to schedule workouts for your team."
              />
            </AppCard>
          ) : (
            <div className="space-y-3">
              {weekPlans.map((plan) => {
                const startDate = parseISO(plan.start_date);
                const endDate = addDays(startDate, 6);
                
                return (
                  <AppCard
                    key={plan.id}
                    className="cursor-pointer hover:shadow-medium transition-shadow"
                    onClick={() => navigate(`/teams/${teamId}/builder/${plan.id}`)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-team-primary/10 flex items-center justify-center">
                        <Layers className="w-6 h-6 text-team-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold truncate">{plan.name}</p>
                          <Tag variant="tier" size="sm">{getTierLabel(plan.tier)}</Tag>
                          {plan.status === "published" ? (
                            <Tag variant="accent" size="sm">
                              <CheckCircle className="w-3 h-3" />
                              Published
                            </Tag>
                          ) : (
                            <Tag variant="neutral" size="sm">Draft</Tag>
                          )}
                        </div>
                        <p className="text-sm text-text-muted">
                          {format(startDate, "MMM d")} – {format(endDate, "MMM d, yyyy")}
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-text-muted flex-shrink-0" />
                    </div>
                  </AppCard>
                );
              })}
            </div>
          )}
        </div>

        {/* Templates */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-text-secondary">
              My Templates
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/templates")}
            >
              Manage
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          
          {!templates || templates.length === 0 ? (
            <AppCard variant="muted">
              <EmptyState
                icon={FileText}
                title="No templates yet"
                description="Save week plans as templates to reuse them later."
              />
            </AppCard>
          ) : (
            <div className="space-y-2">
              {templates.slice(0, 3).map((template) => (
                <AppCard key={template.id} className="py-3">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-text-muted flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{template.name}</p>
                      {template.description && (
                        <p className="text-xs text-text-muted truncate">{template.description}</p>
                      )}
                    </div>
                    <Tag variant="tier" size="sm">{getTierLabel(template.tier)}</Tag>
                  </div>
                </AppCard>
              ))}
            </div>
          )}
        </div>
      </PageContainer>
      
      {/* AI Assist Sheet */}
      <AIAssistSheet
        open={showAIAssist}
        onOpenChange={setShowAIAssist}
        teamId={teamId!}
        mode="week_plan"
        startDate={nextWeekStart}
        onApply={(data) => {
          // Navigate to editor with AI data in state
          navigate(`/teams/${teamId}/builder/new`, { 
            state: { aiDraft: data } 
          });
        }}
      />
    </AppShell>
  );
};

export default WorkoutBuilder;
