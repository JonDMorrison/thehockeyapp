import { useTranslation } from 'react-i18next';
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppShell, PageContainer, PageHeader } from "@/components/app/AppShell";
import { AppCard, AppCardTitle, AppCardDescription } from "@/components/app/AppCard";
import { Tag } from "@/components/app/Tag";
import { EmptyState } from "@/components/app/EmptyState";
import { SkeletonCard } from "@/components/app/Skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/components/app/Toast";
import { format } from "date-fns";
import {
  ChevronLeft,
  Plus,
  FileText,
  Edit,
  Trash2,
  MoreVertical,
} from "lucide-react";
import { getTierLabel } from "@/lib/tierScaling";

interface Template {
  id: string;
  name: string;
  description: string | null;
  tier: string;
  created_at: string;
  updated_at: string;
}

const Templates: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, loading: authLoading, isAuthenticated } = useAuth();

  const tierOptions = [
    { value: "rec", label: t('practice.tierRec') },
    { value: "rep", label: t('practice.tierRep') },
    { value: "elite", label: t('practice.tierElite') },
  ];

  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [deleteTemplate, setDeleteTemplate] = useState<Template | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tier, setTier] = useState("rep");

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/auth", { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  // Reset form when editing changes
  useEffect(() => {
    if (editingTemplate) {
      setName(editingTemplate.name);
      setDescription(editingTemplate.description || "");
      setTier(editingTemplate.tier);
    } else {
      setName("");
      setDescription("");
      setTier("rep");
    }
  }, [editingTemplate]);

  // Fetch templates
  const { data: templates, isLoading } = useQuery({
    queryKey: ["workout-templates", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workout_templates")
        .select("*")
        .eq("created_by_user_id", user!.id)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return data as Template[];
    },
    enabled: !!user,
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editingTemplate) {
        const { error } = await supabase
          .from("workout_templates")
          .update({
            name,
            description: description || null,
            tier,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingTemplate.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("workout_templates")
          .insert({
            name,
            description: description || null,
            tier,
            created_by_user_id: user!.id,
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workout-templates", user?.id] });
      toast.success(editingTemplate ? t('practice.templateUpdated') : t('practice.templateCreated'));
      setShowCreateSheet(false);
      setEditingTemplate(null);
    },
    onError: (error: Error) => {
      toast.error(t('practice.failedToSave'), error.message);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("workout_templates")
        .delete()
        .eq("id", deleteTemplate!.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workout-templates", user?.id] });
      toast.success(t('practice.templateDeleted'));
      setDeleteTemplate(null);
    },
    onError: (error: Error) => {
      toast.error(t('practice.failedToDelete'), error.message);
    },
  });

  if (isLoading || authLoading) {
    return (
      <AppShell>
        <PageContainer>
          <SkeletonCard />
          <SkeletonCard />
        </PageContainer>
      </AppShell>
    );
  }

  return (
    <AppShell
      hideNav
      header={
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => navigate(-1)}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-bold">{t('practice.myTemplates')}</h1>
        </div>
      }
    >
      <PageContainer>
        {/* Create New */}
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setShowCreateSheet(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          {t('practice.newTemplate')}
        </Button>

        {/* Templates List */}
        {!templates || templates.length === 0 ? (
          <AppCard>
            <EmptyState
              icon={FileText}
              title={t('practice.noTemplatesYet')}
              description={t('practice.noTemplatesDesc')}
              action={{
                label: t('practice.createTemplate'),
                onClick: () => setShowCreateSheet(true),
              }}
            />
          </AppCard>
        ) : (
          <div className="space-y-3">
            {templates.map((template) => (
              <AppCard key={template.id}>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-text-muted" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold truncate">{template.name}</p>
                      <Tag variant="tier" size="sm">
                        {getTierLabel(template.tier)}
                      </Tag>
                    </div>
                    {template.description && (
                      <p className="text-sm text-text-muted mt-1 line-clamp-2">
                        {template.description}
                      </p>
                    )}
                    <p className="text-xs text-text-muted mt-2">
                      {t('practice.updatedDate', { date: format(new Date(template.updated_at), "MMM d, yyyy") })}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => {
                        setEditingTemplate(template);
                        setShowCreateSheet(true);
                      }}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setDeleteTemplate(template)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </AppCard>
            ))}
          </div>
        )}
      </PageContainer>

      {/* Create/Edit Sheet */}
      <Sheet
        open={showCreateSheet}
        onOpenChange={(open) => {
          setShowCreateSheet(open);
          if (!open) setEditingTemplate(null);
        }}
      >
        <SheetContent side="bottom" className="h-auto">
          <SheetHeader>
            <SheetTitle>
              {editingTemplate ? t('practice.editTemplate') : t('practice.newTemplate')}
            </SheetTitle>
            <SheetDescription>
              {t('practice.templateSheetDesc')}
            </SheetDescription>
          </SheetHeader>

          <div className="py-6 space-y-4">
            <div>
              <Label>{t('common.name')}</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('practice.templateNamePlaceholder')}
                className="mt-1.5"
              />
            </div>

            <div>
              <Label>{t('practice.descriptionOptional')}</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('practice.descriptionPlaceholder')}
                className="mt-1.5"
                rows={2}
              />
            </div>

            <div>
              <Label>{t('practice.defaultTier')}</Label>
              <Select value={tier} onValueChange={setTier}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {tierOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowCreateSheet(false);
                  setEditingTemplate(null);
                }}
              >
                {t('common.cancel')}
              </Button>
              <Button
                className="flex-1"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending || !name}
              >
                {saveMutation.isPending ? t('common.saving') : t('common.save')}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTemplate} onOpenChange={() => setDeleteTemplate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('practice.deleteTemplateTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('practice.deleteTemplateDesc', { name: deleteTemplate?.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
};

export default Templates;
