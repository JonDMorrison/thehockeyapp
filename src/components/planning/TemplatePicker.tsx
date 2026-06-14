import { useTranslation } from "react-i18next";
import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { startOfWeek } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { AppCard, AppCardTitle, AppCardDescription } from "@/components/app/AppCard";
import { Tag } from "@/components/app/Tag";
import { Button } from "@/components/ui/button";
import { SkeletonCard } from "@/components/app/Skeleton";
import { toast } from "@/components/app/Toast";
import { LayoutTemplate, CalendarRange, Loader2 } from "lucide-react";
import {
  materializeTemplate,
  type ProgramTemplate,
  type TemplateTaskEntry,
} from "@/lib/materializeTemplate";

interface TemplatePickerProps {
  teamId: string;
  userId: string;
  ageDivision?: string | null;
  level?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}

export const TemplatePicker: React.FC<TemplatePickerProps> = ({
  teamId,
  userId,
  ageDivision,
  level,
  open,
  onOpenChange,
  onDone,
}) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [applyingId, setApplyingId] = useState<string | null>(null);

  const { data: templates, isLoading } = useQuery({
    queryKey: ["program-templates"],
    queryFn: async (): Promise<ProgramTemplate[]> => {
      const { data, error } = await supabase
        .from("program_templates")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: true });

      // Table may not be migrated yet — treat as empty rather than crashing.
      if (error) return [];

      return (data ?? []).map((row) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        age_divisions: row.age_divisions ?? [],
        levels: row.levels ?? [],
        weeks: row.weeks,
        tasks: (row.tasks as unknown as TemplateTaskEntry[]) ?? [],
      }));
    },
    enabled: open,
  });

  // Client-side filter: prefer templates matching this team's age/level, but
  // never hide everything — if nothing matches, show all.
  const filtered = React.useMemo(() => {
    const all = templates ?? [];
    if (!ageDivision && !level) return all;
    const matches = all.filter((tpl) => {
      const ageOk = ageDivision ? tpl.age_divisions.includes(ageDivision) : false;
      const levelOk = level ? tpl.levels.includes(level) : false;
      return ageOk || levelOk;
    });
    return matches.length > 0 ? matches : all;
  }, [templates, ageDivision, level]);

  const handleUse = async (template: ProgramTemplate) => {
    setApplyingId(template.id);
    try {
      const comingMonday = startOfWeek(new Date(), { weekStartsOn: 1 });
      const { cardsCreated } = await materializeTemplate(
        template,
        teamId,
        userId,
        comingMonday,
        level
      );
      queryClient.invalidateQueries({ queryKey: ["practice-cards", teamId] });
      toast.success(t("templates.addedToast", { count: cardsCreated }));
      onOpenChange(false);
      onDone();
    } catch {
      toast.error(t("templates.applyError"));
    } finally {
      setApplyingId(null);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto max-h-[85vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <LayoutTemplate className="w-5 h-5 text-team-primary" />
            {t("templates.pickerTitle")}
          </SheetTitle>
          <SheetDescription>{t("templates.pickerSubtitle")}</SheetDescription>
        </SheetHeader>

        <div className="py-6 space-y-3">
          {isLoading ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : filtered.length === 0 ? (
            <AppCard className="border-dashed border-2">
              <div className="text-center py-6">
                <LayoutTemplate className="w-8 h-8 mx-auto text-text-muted mb-2" />
                <p className="text-sm text-text-muted">{t("templates.emptyState")}</p>
              </div>
            </AppCard>
          ) : (
            filtered.map((template) => (
              <AppCard key={template.id}>
                <div className="space-y-3">
                  <div>
                    <AppCardTitle className="text-base">{template.title}</AppCardTitle>
                    {template.description && (
                      <AppCardDescription className="mt-1">
                        {template.description}
                      </AppCardDescription>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <Tag variant="accent" icon={<CalendarRange className="w-3 h-3" />}>
                      {t("templates.weeksLabel", { count: template.weeks })}
                    </Tag>
                    {template.age_divisions.map((age) => (
                      <Tag key={`age-${age}`} variant="neutral">
                        {age}
                      </Tag>
                    ))}
                    {template.levels.map((lvl) => (
                      <Tag key={`lvl-${lvl}`} variant="tier">
                        {lvl}
                      </Tag>
                    ))}
                  </div>

                  <Button
                    className="w-full"
                    onClick={() => handleUse(template)}
                    disabled={applyingId !== null}
                  >
                    {applyingId === template.id && (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    )}
                    {t("templates.useTemplate")}
                  </Button>
                </div>
              </AppCard>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default TemplatePicker;
