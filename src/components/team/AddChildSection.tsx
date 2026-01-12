import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppCard, AppCardTitle, AppCardDescription } from "@/components/app/AppCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Baby, Loader2, Plus, Check } from "lucide-react";

const childSchema = z.object({
  first_name: z.string().trim().min(1, "First name is required").max(50),
  birth_year: z.number().int().min(2008).max(2024),
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
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showSheet, setShowSheet] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [birthYear, setBirthYear] = useState(2015);
  const [shoots, setShoots] = useState<"left" | "right" | "unknown">("unknown");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Get user's children that are NOT on this team yet
  const { data: childrenData, isLoading: loadingChildren } = useQuery({
    queryKey: ["user-children-not-on-team", teamId, user?.id],
    queryFn: async () => {
      // Get all child players owned by this user
      const { data: children } = await supabase
        .from("players")
        .select("id, first_name, last_initial, birth_year")
        .eq("owner_user_id", user!.id)
        .gte("birth_year", 2008); // Children only (born 2008 or later)

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
        // Validate form for new child
        const validated = childSchema.parse({
          first_name: firstName,
          birth_year: birthYear,
          shoots,
        });

        // Create new child player profile
        const { data: newPlayer, error: playerError } = await supabase
          .from("players")
          .insert({
            owner_user_id: user!.id,
            first_name: validated.first_name,
            birth_year: validated.birth_year,
            shoots: validated.shoots,
          })
          .select()
          .single();

        if (playerError) throw playerError;
        playerId = newPlayer.id;

        // Add as guardian with owner role
        await supabase.from("player_guardians").insert({
          player_id: playerId,
          user_id: user!.id,
          guardian_role: "owner",
        });
      }

      // Add to team roster
      const { error: membershipError } = await supabase
        .from("team_memberships")
        .insert({
          team_id: teamId,
          player_id: playerId,
          status: "active",
        });

      if (membershipError) {
        if (membershipError.code === "23505") {
          throw new Error("This child is already on the team");
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
      toast.success("Added to team!", "Your child has been added to the roster.");
      resetForm();
      setShowSheet(false);
    },
    onError: (error: Error) => {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((e) => {
          if (e.path[0]) {
            newErrors[e.path[0] as string] = e.message;
          }
        });
        setErrors(newErrors);
      } else {
        toast.error("Failed to add", error.message);
      }
    },
  });

  const resetForm = () => {
    setFirstName("");
    setBirthYear(2015);
    setShoots("unknown");
    setSelectedChildId(null);
    setErrors({});
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
          <Baby className="w-4 h-4 text-team-primary" />
          Add My Child
        </AppCardTitle>
        <AppCardDescription className="mb-4">
          Add your child to the team roster in one step.
        </AppCardDescription>

        {hasChildrenOnTeam && (
          <div className="mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
            <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
              <Check className="w-4 h-4" />
              <span>
                {childrenData!.childrenOnTeam.length === 1
                  ? `${childrenData!.childrenOnTeam[0].first_name} is on the team`
                  : `${childrenData!.childrenOnTeam.length} children on team`}
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
          Add Child to Team
        </Button>
      </AppCard>

      <Sheet open={showSheet} onOpenChange={setShowSheet}>
        <SheetContent side="bottom" className="h-auto max-h-[85vh]">
          <SheetHeader>
            <SheetTitle>Add Child to {teamName}</SheetTitle>
            <SheetDescription>
              {hasChildrenNotOnTeam
                ? "Select an existing child or create a new profile."
                : "Create your child's player profile."}
            </SheetDescription>
          </SheetHeader>

          <div className="py-6 space-y-4">
            {/* Existing children not on team */}
            {hasChildrenNotOnTeam && (
              <div className="space-y-2">
                <Label>Select Existing Child</Label>
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
                      <p className="text-xs text-muted-foreground">Born {child.birth_year}</p>
                    </button>
                  ))}
                </div>

                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Or create new
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* New child form - only show if no existing child selected */}
            {!selectedChildId && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="childFirstName">Child's First Name</Label>
                  <Input
                    id="childFirstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="e.g. Alex"
                    className={errors.first_name ? "border-destructive" : ""}
                  />
                  {errors.first_name && (
                    <p className="text-xs text-destructive">{errors.first_name}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="childBirthYear">Birth Year</Label>
                  <Select
                    value={String(birthYear)}
                    onValueChange={(v) => setBirthYear(Number(v))}
                  >
                    <SelectTrigger>
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
                  <Label>Shoots</Label>
                  <Select value={shoots} onValueChange={(v: any) => setShoots(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="left">Left</SelectItem>
                      <SelectItem value="right">Right</SelectItem>
                      <SelectItem value="unknown">Not sure yet</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <Button
              variant="team"
              className="w-full"
              onClick={() => addChildMutation.mutate()}
              disabled={addChildMutation.isPending || (!selectedChildId && !firstName.trim())}
            >
              {addChildMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {selectedChildId ? "Add to Team" : "Create & Add to Team"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};
