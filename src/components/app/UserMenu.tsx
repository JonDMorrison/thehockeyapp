import * as React from "react";
import { logger } from "@/core";
import { Link, useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  User,
  Settings,
  LogOut,
  HelpCircle,
  Bell,
  Shield,
  Camera,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { resolveMediaUrl } from "@/lib/media";
import { useTranslation } from "react-i18next";

interface UserMenuProps {
  /** Custom avatar image URL */
  avatarUrl?: string | null;
  /** Custom initials to show in fallback */
  initials?: string;
  /** Custom display name shown in menu header */
  displayName?: string;
  /** Size of the avatar */
  size?: "sm" | "default" | "lg";
  /** Player ID for photo upload (if applicable) */
  playerId?: string;
  /** Callback when photo is uploaded successfully */
  onPhotoUploaded?: (url: string) => void;
  /** Settings path override */
  settingsPath?: string;
  /** Additional className for the trigger button */
  className?: string;
}

export const UserMenu: React.FC<UserMenuProps> = ({
  avatarUrl,
  initials,
  displayName: customDisplayName,
  size = "default",
  playerId,
  onPhotoUploaded,
  settingsPath,
  className,
}) => {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isUploading = false;

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast({
        title: t("common.errorSigningOut"),
        description: error.message,
        variant: "destructive",
      });
    } else {
      navigate("/");
    }
  };

  // Get user initials for avatar fallback
  const getInitials = () => {
    if (initials) return initials;
    if (!user) return "?";
    const email = user.email || "";
    const displayName = user.user_metadata?.display_name;
    if (displayName) {
      return displayName
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return email.slice(0, 2).toUpperCase();
  };

  const displayName =
    customDisplayName ||
    user?.user_metadata?.display_name ||
    user?.email?.split("@")[0] ||
    "User";
  const email = user?.email || "";
  const avatarReference = avatarUrl ?? user?.user_metadata?.avatar_url;
  const [avatarSrc, setAvatarSrc] = React.useState<string | null>(null);
  React.useEffect(() => {
    let active = true;
    setAvatarSrc(null);
    void resolveMediaUrl(avatarReference).then((url) => {
      if (active) setAvatarSrc(url);
    });
    return () => {
      active = false;
    };
  }, [avatarReference]);

  const sizeClasses = {
    sm: "h-8 w-8",
    default: "h-10 w-10",
    lg: "h-14 w-14",
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            aria-label={
              playerId ? `Player options for ${displayName}` : "Account menu"
            }
            className={cn(
              "relative flex items-center gap-2 p-1 rounded-full hover:bg-muted/50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-2",
              isUploading && "opacity-50 pointer-events-none",
              className,
            )}
          >
            <Avatar className={cn(sizeClasses[size], "border-2 border-border")}>
              <AvatarImage src={avatarSrc} alt={displayName} />
              <AvatarFallback className="bg-muted text-muted-foreground font-semibold">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-56 bg-card border border-border shadow-depth z-50"
          align="start"
          sideOffset={8}
        >
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{displayName}</p>
              <p className="text-xs leading-none text-muted-foreground">
                {email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          {/* Photo upload option - only show if playerId is provided */}
          {playerId && (
            <>
              <DropdownMenuItem
                onClick={() => navigate(`/players/${playerId}#photo`)}
                className="cursor-pointer"
              >
                <Camera className="mr-2 h-4 w-4" />
                <span>{t("settings.settings.changePhoto")}</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}

          <DropdownMenuGroup>
            <DropdownMenuItem asChild>
              <Link to="/players" className="flex items-center cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                <span>{t("nav.myPlayers")}</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link
                to={settingsPath || "/settings"}
                className="flex items-center cursor-pointer"
              >
                <Settings className="mr-2 h-4 w-4" />
                <span>{t("nav.settings")}</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link
                to="/settings#notifications"
                className="flex items-center cursor-pointer"
              >
                <Bell className="mr-2 h-4 w-4" />
                <span>{t("settings.settings.notifications")}</span>
              </Link>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem asChild>
              <Link to="/privacy" className="flex items-center cursor-pointer">
                <Shield className="mr-2 h-4 w-4" />
                <span>{t("settings.settings.privacy")}</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/contact" className="flex items-center cursor-pointer">
                <HelpCircle className="mr-2 h-4 w-4" />
                <span>{t("common.helpAndSupport")}</span>
              </Link>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleSignOut}
            className="text-destructive focus:text-destructive cursor-pointer"
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>{t("common.logOut")}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
};
