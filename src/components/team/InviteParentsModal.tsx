import React, { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/app/Toast";
import { SkeletonListItem } from "@/components/app/Skeleton";
import { Loader2, Copy, Check, Link as LinkIcon, RefreshCw, Calendar, Baby, Users } from "lucide-react";

const childSchema = z.object({
  first_name: z.string().trim().min(1, "First name is required").max(50),
  birth_year: z.number().int().min(2008).max(2024),
  shoots: z.enum(["left", "right", "unknown"]),
});

interface InviteParentsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
  teamName: string;
  initialTab?: "invite" | "add-child";
}

export const InviteParentsModal: React.FC<InviteParentsModalProps> = ({
  open,
  onOpenChange,
  teamId,
  teamName,
  initialTab = "invite",
}) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState(initialTab);
  const [copied, setCopied] = useState(false);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);

  // Add child form state
  const [firstName, setFirstName] = useState("");
  const [birthYear, setBirthYear] = useState(2015);
  const [shoots, setShoots] = useState<"left" | "right" | "unknown">("unknown");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);

  // Reset tab when modal opens
  useEffect(() => {
    if (open) {
      setActiveTab(initialTab);
    }
  }, [open, initialTab]);

  // Fetch current active invite
  const { data: invite, isLoading: isLoadingInvite } = useQuery({
    queryKey: ["team-parent-invite", teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_invites")
        .select("*")
        .eq("team_id", teamId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: open && !!user,
  });

  // Get user's children that are NOT on this team yet
  const { data: childrenData, isLoading: loadingChildren } = useQuery({
    queryKey: ["user-children-not-on-team", teamId, user?.id],
    queryFn: async () => {
      const { data: children } = await supabase
        .from("players")
        .select("id, first_name, last_initial, birth_year")
        .eq("owner_user_id", user!.id)
        .gte("birth_year", 2008);

      if (!children || children.length === 0) {
        return { childrenOnTeam: [], childrenNotOnTeam: [] };
      }

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
    enabled: open && !!user,
  });

  // Generate/regenerate invite
  const regenerateInvite = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("regenerate_team_invite", {
        p_team_id: teamId,
      });

      if (error) throw error;
      
      const result = data as { success: boolean; error?: string; token?: string; expires_at?: string };
      if (!result.success) {
        throw new Error(result.error || "Failed to generate invite");
      }
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-parent-invite", teamId] });
      toast.success("Invite created", "Share the link with parents.");
      setShowRegenerateConfirm(false);
    },
    onError: (error: Error) => {
      toast.error("Failed to generate invite", error.message);
    },
  });

  // Add child to team
  const addChildMutation = useMutation({
    mutationFn: async () => {
      let playerId: string;

      if (selectedChildId) {
        playerId = selectedChildId;
      } else {
        const validated = childSchema.parse({
          first_name: firstName,
          birth_year: birthYear,
          shoots,
        });

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

        await supabase.from("player_guardians").insert({
          player_id: playerId,
          user_id: user!.id,
          guardian_role: "owner",
        });
      }

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
      queryClient.invalidateQueries({ queryKey: ["team-dashboard", teamId] });
      queryClient.invalidateQueries({ queryKey: ["user-roles"] });
      toast.success("Added to team!", "Your child has been added to the roster.");
      resetChildForm();
      onOpenChange(false);
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

  const resetChildForm = () => {
    setFirstName("");
    setBirthYear(2015);
    setShoots("unknown");
    setSelectedChildId(null);
    setErrors({});
  };

  const inviteLink = invite?.token 
    ? `${window.location.origin}/join/${invite.token}` 
    : null;

  const handleCopy = async () => {
    if (!inviteLink) return;

    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      toast.success("Link copied", "Share it with parents.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy", "Please copy the link manually.");
    }
  };

  const handleCopyWithMessage = async () => {
    if (!inviteLink) return;

    const message = `Hi parents — use this link to join our training hub and add your player:\n${inviteLink}`;

    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      toast.success("Message copied", "Ready to paste in TeamSnap or email.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy", "Please copy the link manually.");
    }
  };

  const isExpired = invite?.expires_at && new Date(invite.expires_at) < new Date();
  const hasChildrenNotOnTeam = (childrenData?.childrenNotOnTeam?.length ?? 0) > 0;
  const hasChildrenOnTeam = (childrenData?.childrenOnTeam?.length ?? 0) > 0;

  const currentYear = new Date().getFullYear();
  const birthYearOptions = Array.from(
    { length: currentYear - 2007 },
    (_, i) => currentYear - i
  ).filter((y) => y >= 2008);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Players</DialogTitle>
            <DialogDescription>
              Add your own child or invite other families to join {teamName}.
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="add-child" className="gap-2">
                <Baby className="w-4 h-4" />
                My Child
              </TabsTrigger>
              <TabsTrigger value="invite" className="gap-2">
                <Users className="w-4 h-4" />
                Invite Parents
              </TabsTrigger>
            </TabsList>

            {/* Add My Child Tab */}
            <TabsContent value="add-child" className="space-y-4 mt-4">
              {loadingChildren ? (
                <SkeletonListItem />
              ) : (
                <>
                  {hasChildrenOnTeam && (
                    <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
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

                  {/* New child form */}
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
                </>
              )}
            </TabsContent>

            {/* Invite Parents Tab */}
            <TabsContent value="invite" className="space-y-4 mt-4">
              {isLoadingInvite ? (
                <SkeletonListItem />
              ) : !invite || isExpired ? (
                <div className="py-6 text-center">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <LinkIcon className="w-6 h-6 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    {isExpired 
                      ? "Your invite link has expired. Generate a new one."
                      : "Generate an invite link to share with parents."}
                  </p>
                  <Button
                    variant="team"
                    onClick={() => regenerateInvite.mutate()}
                    disabled={regenerateInvite.isPending}
                  >
                    {regenerateInvite.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                    Generate Invite Link
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <LinkIcon className="w-4 h-4 text-green-600" />
                      <p className="text-sm font-medium text-green-700 dark:text-green-400">Active Invite Link</p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                      <Calendar className="w-3 h-3" />
                      Expires {new Date(invite.expires_at).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-2">
                      <Input value={inviteLink || ""} readOnly className="text-xs" />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={handleCopy}
                      >
                        {copied ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-muted">
                    <p className="text-xs text-muted-foreground mb-2">
                      Quick message to copy for TeamSnap/email:
                    </p>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full"
                      onClick={handleCopyWithMessage}
                    >
                      <Copy className="w-3 h-3" />
                      Copy with Message
                    </Button>
                  </div>

                  <DialogFooter className="flex-col sm:flex-row gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowRegenerateConfirm(true)}
                      className="text-destructive hover:bg-destructive/10"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Regenerate Link
                    </Button>
                    <Button variant="team" onClick={() => onOpenChange(false)}>
                      Done
                    </Button>
                  </DialogFooter>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showRegenerateConfirm} onOpenChange={setShowRegenerateConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerate Invite Link?</AlertDialogTitle>
            <AlertDialogDescription>
              This will invalidate the current link. Anyone who hasn't joined yet
              will need the new link.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => regenerateInvite.mutate()}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {regenerateInvite.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Regenerate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
