const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const checks = [];

function expect(file, pattern, message) {
  const source = read(file);
  if (!pattern.test(source)) throw new Error(`${message} (${file})`);
  checks.push(message);
}

function reject(file, pattern, message) {
  const source = read(file);
  if (pattern.test(source)) throw new Error(`${message} (${file})`);
  checks.push(message);
}

expect("src/pages/Auth.tsx", /role === "coach"[\s\S]{0,120}return "\/onboarding\/coach"/, "coach signup enters guided onboarding");
expect("src/pages/Auth.tsx", /role === "association"[\s\S]{0,120}return "\/associations\/new"/, "association signup enters association setup");
expect("src/pages/Welcome.tsx", /storedRole === "coach"[\s\S]{0,120}navigate\("\/onboarding\/coach"/, "coach welcome resumes guided onboarding");
expect("src/pages/Welcome.tsx", /storedRole === "association"[\s\S]{0,120}navigate\("\/associations\/new"/, "association welcome resumes association setup");
expect("src/hooks/useUserRoles.ts", /\.from\("association_roles"\)/, "one account discovers association roles");
expect("src/hooks/useUserRoles.ts", /\.from\("team_roles"\)/, "one account discovers coaching roles");
expect("src/hooks/useUserRoles.ts", /\.from\("player_guardians"\)/, "one account discovers parent roles");
expect("src/components/app/ContextSwitcher.tsx", /navigate\(`\/associations\/\$\{associationId\}`\)/, "workspace switcher opens association workspaces");
expect("src/components/app/ContextSwitcher.tsx", /navigate\(`\/teams\/\$\{teamId\}`\)/, "workspace switcher opens coaching workspaces");
expect("src/components/app/ContextSwitcher.tsx", /navigate\(`\/players\/\$\{playerId\}\/home`\)/, "workspace switcher opens parent and player workspaces");
expect("src/components/app/ContextSwitcher.tsx", /navigate\("\/associations\/new"\)[\s\S]*navigate\("\/teams\/new"\)[\s\S]*navigate\("\/players\/new"\)[\s\S]*navigate\("\/solo\/setup"\)/, "existing accounts can add every role without signing out");
expect("src/pages/Today.tsx", /activeView === "association"[\s\S]*activeView === "coach"[\s\S]*activeView === "parent"[\s\S]*activeView === "player"/, "account home restores every active role");
expect("src/pages/JoinTeam.tsx", /\/auth\?redirect=.*\/join\//, "team invite survives authentication");
expect("src/pages/JoinTeamPlayer.tsx", /\/auth\?redirect=.*\/join\//, "player selection invite survives authentication");
expect("src/pages/PlayerToday.tsx", /\.eq\("program_source", "team"\)/, "team workout view excludes private family workouts");
expect("src/pages/PlayerToday.tsx", /const allRequiredTasksComplete = requiredCompletedCount >= requiredCount/, "session completion requires all required tasks");
expect("src/pages/PlayerToday.tsx", /disabled=\{!allRequiredTasksComplete \|\| pendingTaskWrites > 0\}/, "session completion waits for required task writes");
expect("src/pages/PlayerToday.tsx", /if \(!allRequiredTasksComplete \|\| pendingTaskWrites > 0\) return/, "session completion handler rejects incomplete workouts");
const surfacedPlayerWriteErrors = [...read("src/pages/PlayerToday.tsx").matchAll(/if \((?:insert|update)Error\) throw (?:insert|update)Error;/g)];
if (surfacedPlayerWriteErrors.length < 6) throw new Error("player completion writes must surface database errors (src/pages/PlayerToday.tsx)");
checks.push("player completion writes surface database errors");
expect("src/components/player/ParentProgramBuilderModal.tsx", /rpc\("replace_personal_training_program"/, "family plan uses atomic private storage");
reject("src/components/player/ParentProgramBuilderModal.tsx", /\.from\("practice_cards"\)/, "family plan never writes shared team cards");
expect("src/pages/SoloProgramBuilder.tsx", /rpc\("replace_personal_training_program"/, "solo program uses atomic storage");
expect("src/pages/QuickAssign.tsx", /rpc\("replace_team_practice_card"/, "quick assign uses an atomic write");
reject("src/pages/QuickAssign.tsx", /from\("practice_tasks"\)\.delete/, "quick assign never deletes tasks before a replacement succeeds");
expect("src/components/planning/ProgramBuilderWizard.tsx", /rpc\("create_team_training_program"/, "multi-week program uses an atomic write");
expect("src/components/planning/ProgramBuilderWizard.tsx", /navigate\(`\/teams\/\$\{teamId\}\/builder\/\$\{result\.first_plan_id\}`\)/, "coach is taken to review and publish Week 1");
expect("supabase/migrations/20260914053407_launch_journey_integrity.sql", /AS RESTRICTIVE FOR SELECT TO authenticated/, "legacy family privacy uses restrictive RLS");
expect("supabase/config.toml", /\[auth\.email\][\s\S]*enable_confirmations = false/, "new accounts do not require email confirmation");
expect("src/components/team/InviteParentsModal.tsx", /addChildTitle/, "add-child flow has its own title");
expect("src/components/team/InviteParentsModal.tsx", /focusFirstInvalidField/, "add-child validation focuses the first invalid field");
expect("src/lib/templateRanking.ts", /ageMatches && levelMatches\) score = 0/, "exact age and level templates rank first");
expect("src/components/app/RouteMetadata.tsx", /noindex, nofollow/, "private and invite pages are not indexable");
expect("vercel.json", /X-Robots-Tag[\s\S]*noindex, nofollow/, "private routes send a server-level noindex header");
expect("scripts/prerender.cjs", /writeMetadataFallbacks\(\)/, "public routes receive distinct crawler metadata without JavaScript");
expect("supabase/migrations/20260919203204_team_invite_player_onboarding.sql", /ADD COLUMN IF NOT EXISTS collect_player_profile boolean NOT NULL DEFAULT false/, "team invites can request player profile onboarding");
expect("supabase/migrations/20260919203204_team_invite_player_onboarding.sql", /position IN \('forward', 'defence', 'goalie', 'unsure'\)/, "player position values are constrained");
expect("src/pages/CoachOnboarding.tsx", /Collect player profiles[\s\S]*coach-collect-player-profile/, "team creation offers the player profile toggle");
expect("src/components/team/InviteParentsModal.tsx", /Collect player profile after joining[\s\S]*collect-player-profile/, "family invite management offers the player profile toggle");
expect("src/pages/JoinTeamPlayer.tsx", /collect_player_profile[\s\S]*team-onboarding/, "enabled invites continue into player profile onboarding");
expect("src/pages/PlayerTeamOnboarding.tsx", /Position[\s\S]*Favourite player[\s\S]*Favourite thing about hockey[\s\S]*Hockey dream[\s\S]*Add a player photo/, "player onboarding collects the requested profile details");
expect("src/pages/Auth.tsx", /new URLSearchParams\(current\)[\s\S]*next\.set\("mode", nextMode\)/, "switching from sign in to sign up preserves the invite return path");
expect("src/pages/CoachOnboarding.tsx", /void queryClient\.invalidateQueries\(\{ queryKey: \["user-coach-roles"\]/, "coach onboarding does not wait on background refreshes before showing the invite step");

console.log(`Launch journey checks passed (${checks.length}).`);
