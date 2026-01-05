import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { GoalContribution } from '@/hooks/useTeamGoal';
import { Trophy, Medal, Award } from 'lucide-react';

interface ContributorLeaderboardProps {
  contributions: GoalContribution[];
  compact?: boolean;
  className?: string;
}

const rankIcons = [Trophy, Medal, Award];
const rankColors = ['text-amber-500', 'text-slate-400', 'text-amber-700'];

export function ContributorLeaderboard({ contributions, compact = false, className }: ContributorLeaderboardProps) {
  if (contributions.length === 0) return null;

  return (
    <div className={cn('space-y-2', className)}>
      {!compact && (
        <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Trophy className="w-4 h-4" />
          Top Contributors
        </h4>
      )}
      
      <div className={cn('space-y-2', compact && 'space-y-1.5')}>
        {contributions.map((contribution, index) => {
          const RankIcon = rankIcons[index] || null;
          const rankColor = rankColors[index] || 'text-muted-foreground';
          const playerName = contribution.player?.first_name || 'Player';
          const lastInitial = contribution.player?.last_initial || '';

          return (
            <div
              key={contribution.id}
              className={cn(
                'flex items-center gap-2',
                compact ? 'text-sm' : 'p-2 rounded-lg bg-muted/50'
              )}
            >
              {/* Rank */}
              <div className={cn('w-5 flex-shrink-0 flex items-center justify-center', rankColor)}>
                {RankIcon ? (
                  <RankIcon className={cn(compact ? 'w-3.5 h-3.5' : 'w-4 h-4')} />
                ) : (
                  <span className="text-xs font-medium">{index + 1}</span>
                )}
              </div>

              {/* Avatar */}
              <Avatar className={cn(compact ? 'w-6 h-6' : 'w-8 h-8')}>
                <AvatarImage src={contribution.player?.profile_photo_url || undefined} />
                <AvatarFallback className="text-xs">
                  {playerName[0]}{lastInitial}
                </AvatarFallback>
              </Avatar>

              {/* Name */}
              <span className={cn('flex-1 truncate', compact ? 'text-xs' : 'text-sm font-medium')}>
                {playerName} {lastInitial}
              </span>

              {/* Value */}
              <span className={cn('text-muted-foreground', compact ? 'text-xs' : 'text-sm font-medium')}>
                {contribution.contribution_value.toLocaleString()}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
