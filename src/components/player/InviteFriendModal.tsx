import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Check, Share2, X, Gift, Calendar, Dumbbell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface InviteFriendModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  playerId: string;
  todayCardId?: string | null;
  activePlanId?: string | null;
  playerName: string;
}

type ShareType = 'workout' | 'program';

export function InviteFriendModal({
  open,
  onOpenChange,
  playerId,
  todayCardId,
  activePlanId,
  playerName,
}: InviteFriendModalProps) {
  const [selectedType, setSelectedType] = useState<ShareType | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedWithMessage, setCopiedWithMessage] = useState(false);

  const handleSelectType = async (type: ShareType) => {
    setSelectedType(type);
    setIsCreating(true);
    
    try {
      // Generate a unique token
      const token = crypto.randomUUID().slice(0, 12);
      
      // Calculate expiry (7 days from now for the invite itself)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const { error } = await supabase
        .from('solo_referral_invites')
        .insert({
          referrer_player_id: playerId,
          token,
          share_type: type,
          workout_card_id: type === 'workout' ? todayCardId : null,
          plan_id: type === 'program' ? activePlanId : null,
          expires_at: expiresAt.toISOString(),
          status: 'pending'
        });

      if (error) throw error;

      // Create the invite link
      const baseUrl = window.location.origin;
      setInviteLink(`${baseUrl}/solo/try/${token}`);
    } catch (err) {
      console.error('Error creating invite:', err);
      toast.error("Couldn't create invite link");
      setSelectedType(null);
    } finally {
      setIsCreating(false);
    }
  };

  const getShareMessage = () => {
    const typeLabel = selectedType === 'workout' ? "workout" : "training program";
    return `Hey! Try this hockey ${typeLabel} with me 🏒\n${inviteLink}\nYou get 7 days free to check it out!`;
  };

  const handleCopyLink = async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Link copied!");
    } catch {
      toast.error("Couldn't copy link");
    }
  };

  const handleCopyWithMessage = async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(getShareMessage());
      setCopiedWithMessage(true);
      setTimeout(() => setCopiedWithMessage(false), 2000);
      toast.success("Message copied - paste it in a text!");
    } catch {
      toast.error("Couldn't copy message");
    }
  };

  const handleNativeShare = async () => {
    if (!inviteLink || !navigator.share) return;
    try {
      await navigator.share({
        title: "Try this hockey workout!",
        text: getShareMessage(),
        url: inviteLink,
      });
    } catch (err) {
      // User cancelled or share failed - that's ok
    }
  };

  const handleClose = () => {
    setSelectedType(null);
    setInviteLink(null);
    setCopied(false);
    setCopiedWithMessage(false);
    onOpenChange(false);
  };

  const canShareWorkout = !!todayCardId;
  const canShareProgram = !!activePlanId;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            Invite A Friend
          </DialogTitle>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {!inviteLink ? (
            <motion.div
              key="select"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4 py-4"
            >
              <p className="text-sm text-muted-foreground">
                Share a workout with a friend and give them 7 days free to try it out!
              </p>

              <div className="space-y-3">
                {/* Share Today's Workout */}
                <button
                  onClick={() => canShareWorkout && handleSelectType('workout')}
                  disabled={!canShareWorkout || isCreating}
                  className={cn(
                    "w-full p-4 rounded-xl border text-left transition-all",
                    canShareWorkout
                      ? "border-border hover:border-primary/50 hover:bg-primary/5 cursor-pointer"
                      : "border-border/50 bg-muted/30 cursor-not-allowed opacity-60"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center",
                      canShareWorkout ? "bg-primary/10" : "bg-muted"
                    )}>
                      <Dumbbell className={cn(
                        "h-5 w-5",
                        canShareWorkout ? "text-primary" : "text-muted-foreground"
                      )} />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Today's Workout</p>
                      <p className="text-xs text-muted-foreground">
                        {canShareWorkout 
                          ? "Share what you're training today" 
                          : "No workout scheduled for today"
                        }
                      </p>
                    </div>
                  </div>
                </button>

                {/* Share Training Program */}
                <button
                  onClick={() => canShareProgram && handleSelectType('program')}
                  disabled={!canShareProgram || isCreating}
                  className={cn(
                    "w-full p-4 rounded-xl border text-left transition-all",
                    canShareProgram
                      ? "border-border hover:border-primary/50 hover:bg-primary/5 cursor-pointer"
                      : "border-border/50 bg-muted/30 cursor-not-allowed opacity-60"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center",
                      canShareProgram ? "bg-primary/10" : "bg-muted"
                    )}>
                      <Calendar className={cn(
                        "h-5 w-5",
                        canShareProgram ? "text-primary" : "text-muted-foreground"
                      )} />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">My Training Program</p>
                      <p className="text-xs text-muted-foreground">
                        {canShareProgram 
                          ? "Share your full training plan" 
                          : "No active program set up"
                        }
                      </p>
                    </div>
                  </div>
                </button>
              </div>

              {isCreating && (
                <div className="flex items-center justify-center py-2">
                  <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="share"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4 py-4"
            >
              {/* Success Message */}
              <div className="bg-primary/10 rounded-xl p-4 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/20 mb-3">
                  <Check className="h-6 w-6 text-primary" />
                </div>
                <p className="font-medium text-foreground">Invite link ready!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Your friend will get 7 days free
                </p>
              </div>

              {/* Preview Message */}
              <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground border border-border">
                <p className="whitespace-pre-line">{getShareMessage()}</p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                <Button
                  onClick={handleCopyWithMessage}
                  className="w-full"
                  size="lg"
                >
                  {copiedWithMessage ? (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy Message to Text
                    </>
                  )}
                </Button>

                <div className="flex gap-2">
                  <Button
                    onClick={handleCopyLink}
                    variant="outline"
                    className="flex-1"
                  >
                    {copied ? (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="mr-2 h-4 w-4" />
                        Copy Link
                      </>
                    )}
                  </Button>

                  {typeof navigator !== 'undefined' && navigator.share && (
                    <Button
                      onClick={handleNativeShare}
                      variant="outline"
                      className="flex-1"
                    >
                      <Share2 className="mr-2 h-4 w-4" />
                      Share
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}