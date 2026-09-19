import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppCard, AppCardTitle, AppCardDescription } from "@/components/app/AppCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RequiredMark } from "@/components/ui/required-mark";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/app/Toast";
import { focusFirstInvalidField, getZodFieldErrors } from "@/lib/formValidation";
import { Baby, Loader2, Plus, Check } from "lucide-react";

type CreatePlayerResult = { success?: boolean; player_id?: string };

const childSchema = z.object({
  first_name: z.string().trim().min(1, "Enter the player's first name").max(50, "First name must be 50 characters or fewer"),
  birth_year: z.number().int().min(2008, "Choose a valid birth year").max(new Date().getFullYear(), "Choose a valid birth year"),
  shoots: z.enum(["left", "right", "unknown"]),
});

interface AddChildSectionProps {
  teamId: string;
  teamName: string;
}

export const AddChildSection: React.FC<AddChildSectionProps> = ({
  teamId,
  teamName,
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showSheet, setShowSheet] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [birthYear, setBirthYear] = useState(2015);
  const [shoots, setShoots] = useState<"left" | "right" | "unknown">("unknown");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [adultAcknowledged, setAdultAcknowledged] = useState(false);

  // Get user's children that are NOT on this team yet
  const { data: childrenData, isLoading: loadingChildren } = useQuery({
    queryKey: ["user-children-not-on-team", teamId, user?.id],
    queryFn: async () => {
      const adultBirthYear = new Date().getFullYear() - 18;
      // Get all child players owned by this user
      const { data: children } = await supabase
        .from("players")
        .select("id, first_name, last_initial, birth_year")
        .eq("owner_user_id", user!.id)
        .gt("birth_year", adultBirthYear);

      if (!children || children.length === 0) {
        return { childrenOnTeam: [], childrenNotOnTeam: [] };
      }

      // Check which are already on this team
      const { data: memberships } = await supabase
        .from("team_memberships")
        .select("player_id")
        .eq("team_id", teamId)
        .in("player_id", children.map((c) => c.id))
        .eq("status", "active");

      const onTeamIds = new Set(memberships?.map((m) => m.player_id) || []);

      return {
        childrenOnTeam: children.filter((c) => onTeamIds.has(c.id)),
        childrenNotOnTeam: children.filter((c) => !onTeamIds.has(c.id)),
      };
    },
    enabled: !!user,
  });

  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);

  // Add child to team
  const addChildMutation = useMutation({
    mutationFn: async () => {
      let playerId: string;

      if (selectedChildId) {
        // Use existing child
        playerId = selectedChildId;
      } else {
        if (!adultAcknowledged) throw new Error("Confirm that you are authorized to manage this player profile.");
        // Validate form for new child
        const validated = childSchema.parse({
          first_name: firstName,
          birth_year: birthYear,
          shoots,
        });

        const { data: result, error: playerError } = await supabase.rpc("create_managed_player", {
          p_first_name: validated.first_name,
          p_birth_year: validated.birth_year,
          p_shoots: validated.shoots,
        });
        if (playerError) throw playerError;
        const newPlayer = result as unknown as CreatePlayerResult;
        if (!newPlayer.player_id) throw new Error("Player profile was not created");
        playerId = newPlayer.player_id;
      }

      // Add to team roster
      const { error: membershipError } = await supabase.rpc("add_my_player_to_team", {
        p_team_id: teamId,
        p_player_id: playerId,
      });

      if (membershipError) {
        if (membershipError.code === "23505") {
          throw new Error("This child is already on the team");
        }
        if (membershipError.message?.includes("team_plan_player_cap_reached")) {
          throw new Error("This team's plan covers up to 24 players. Ask the head coach to remove a player or upgrade.");
        }
        throw membershipError;
      }

      return { playerId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-children-not-on-team", teamId] });
      queryClient.invalidateQueries({ queryKey: ["team-roster", teamId] });
      queryClient.invalidateQueries({ queryKey: ["user-roles"] });
      queryClient.invalidateQueries({ queryKey: ["user-guardian-roles"] });
      toast.success(t("teams.addChild.toastAddedTitle"), t("teams.addChild.toastAddedDescription"));
      resetForm();
      setShowSheet(false);
    },
    onError: (error: Error) => {
      if (error instanceof z.ZodError) {
        const newErrors = getZodFieldErrors(error);
        setErrors(newErrors);
        focusFirstInvalidField(newErrors, {
          first_name: "addChildFirstName",
          birth_year: "addChildBirthYear",
          shoots: "addChildShoots",
        });
      } else {
        toast.error(t("teams.addChild.toastFailedTitle"), error.message);
      }
    },
  });

  const resetForm = () => {
    setFirstName("");
    setBirthYear(2015);
    setShoots("unknown");
    setSelectedChildId(null);
    setErrors({});
    setAdultAcknowledged(false);
  };

  const handleAddChild = () => {
    if (selectedChildId) {
      setErrors({});
      addChildMutation.mutate();
      return;
    }

    const result = childSchema.safeParse({ first_name: firstName, birth_year: birthYear, shoots });
    const nextErrors = result.success ? {} : getZodFieldErrors(result.error);
    if (!adultAcknowledged) {
      nextErrors.consent = "Confirm that you are authorized to manage this player profile";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      focusFirstInvalidField(nextErrors, {
        first_name: "addChildFirstName",
        birth_year: "addChildBirthYear",
        shoots: "addChildShoots",
        consent: "addChildAdultAcknowledgement",
      });
      return;
    }
    addChildMutation.mutate();
  };

  const currentYear = new Date().getFullYear();
  const birthYearOptions = Array.from(
    { length: currentYear - 2007 },
    (_, i) => currentYear - i
  ).filter((y) => y >= 2008);

  const hasChildrenOnTeam = (childrenData?.childrenOnTeam?.length ?? 0) > 0;
  const hasChildrenNotOnTeam = (childrenData?.childrenNotOnTeam?.length ?? 0) > 0;

  return (
    <>
      <AppCard>
        <AppCardTitle className="text-lg flex items-center gap-2 mb-1">
          <Baby className="w-4 h-4 text-primary" />
          {t("teams.addChild.title")}
        </AppCardTitle>
        <AppCardDescription className="mb-4">
          {t("teams.addChild.description")}
        </AppCardDescription>

        {hasChildrenOnTeam && (
          <div className="mb-4 p-3 rounded-lg bg-success/10 border border-success/20">
            <div className="flex items-center gap-2 text-sm text-success dark:text-success">
              <Check className="w-4 h-4" />
              <span>
                {childrenData!.childrenOnTeam.length === 1
                  ? t("teams.addChild.onTeamSingle", { name: childrenData!.childrenOnTeam[0].first_name })
                  : t("teams.addChild.onTeamMultiple", { count: childrenData!.childrenOnTeam.length })}
              </span>
            </div>
          </div>
        )}

        <Button
          variant="team-soft"
          onClick={() => {
            resetForm();
            setShowSheet(true);
          }}
          disabled={loadingChildren}
          className="w-full"
        >
          <Plus className="w-4 h-4 mr-2" />
          {t("teams.addChild.button")}
        </Button>
      </AppCard>

      <Sheet open={showSheet} onOpenChange={setShowSheet}>
        <SheetContent side="bottom" className="h-auto max-h-[85vh]">
          <SheetHeader>
            <SheetTitle>{t("teams.addChild.sheetTitle", { teamName })}</SheetTitle>
            <SheetDescription>
              {hasChildrenNotOnTeam
                ? t("teams.addChild.sheetDescriptionExisting")
                : t("teams.addChild.sheetDescriptionNew")}
            </SheetDescription>
          </SheetHeader>

          <div className="py-6 space-y-4">
            {/* Existing children not on team */}
            {hasChildrenNotOnTeam && (
              <div className="space-y-2">
                <Label>{t("teams.addChild.selectExisting")}</Label>
                <div className="space-y-2">
                  {childrenData!.childrenNotOnTeam.map((child) => (
                    <button
                      key={child.id}
                      type="button"
                      onClick={() => setSelectedChildId(child.id === selectedChildId ? null : child.id)}
                      className={`w-full p-3 rounded-lg border text-left transition-colors ${
                        selectedChildId === child.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <p className="font-medium text-sm">
                        {child.first_name} {child.last_initial && `${child.last_initial}.`}
                      </p>
                      <p className="text-xs text-muted-foreground">{t("teams.addChild.bornYear", { year: child.birth_year })}</p>
                    </button>
                  ))}
                </div>

                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      {t("teams.addChild.orCreateNew")}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* New child form - only show if no existing child selected */}
            {!selectedChildId && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="addChildFirstName">{t("teams.addChild.firstName")}<RequiredMark /></Label>
                  <Input
                    id="addChildFirstName"
                    value={firstName}
                    onChange={(e) => {
                      setFirstName(e.target.value);
                      if (errors.first_name) setErrors((current) => ({ ...current, first_name: "" }));
                    }}
                    placeholder="e.g. Alex"
                    maxLength={50}
                    className={errors.first_name ? "border-destructive" : ""}
                    aria-invalid={Boolean(errors.first_name)}
                    aria-describedby={errors.first_name ? "add-child-first-name-error" : undefined}
                  />
                  {errors.first_name && (
                    <p id="add-child-first-name-error" role="alert" className="text-xs text-destructive">{errors.first_name}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="addChildBirthYear">{t("teams.addChild.birthYear")}<RequiredMark /></Label>
                  <Select
                    value={String(birthYear)}
                    onValueChange={(v) => setBirthYear(Number(v))}
                  >
                    <SelectTrigger id="addChildBirthYear">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {birthYearOptions.map((year) => (
                        <SelectItem key={year} value={String(year)}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="addChildShoots">{t("teams.addChild.shoots")}<RequiredMark /></Label>
                  <Select value={shoots} onValueChange={(v) => setShoots(v as "left" | "right" | "unknown")}>
                    <SelectTrigger id="addChildShoots">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="left">{t("teams.addChild.shootsLeft")}</SelectItem>
                      <SelectItem value="right">{t("teams.addChild.shootsRight")}</SelectItem>
                      <SelectItem value="unknown">{t("teams.addChild.shootsUnknown")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <label htmlFor="addChildAdultAcknowledgement" className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm ${errors.consent ? "border-destructive" : "border-border"}`}>
                  <Checkbox
                    id="addChildAdultAcknowledgement"
                    checked={adultAcknowledged}
                    onCheckedChange={(checked) => {
                      setAdultAcknowledged(checked === true);
                      if (checked === true) setErrors((current) => ({ ...current, consent: "" }));
                    }}
                    aria-invalid={Boolean(errors.consent)}
                    aria-describedby={errors.consent ? "add-child-consent-error" : undefined}
                    className="mt-0.5"
                  />
                  <span>
                    I am this player’s parent or legal guardian and I am authorized to create this profile.<RequiredMark />
                    <span className="mt-1 block text-xs text-muted-foreground">Private photos and AI personalization remain off by default.</span>
                  </span>
                </label>
                {errors.consent && <p id="add-child-consent-error" role="alert" className="text-xs text-destructive">{errors.consent}</p>}
              </>
            )}

            <Button
              variant="team"
              className="w-full"
              onClick={handleAddChild}
              disabled={addChildMutation.isPending}
            >
              {addChildMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {selectedChildId ? t("teams.addChild.addToTeam") : t("teams.addChild.createAndAdd")}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};
