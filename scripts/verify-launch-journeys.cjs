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
expect("src/pages/Welcome.tsx", /storedRole === "coach"[\s\S]{0,120}navigate\("\/onboarding\/coach"/, "coach welcome resumes guided onboarding");
expect("src/pages/JoinTeam.tsx", /\/auth\?redirect=.*\/join\//, "team invite survives authentication");
expect("src/pages/JoinTeamPlayer.tsx", /\/auth\?redirect=.*\/join\//, "player selection invite survives authentication");
expect("src/pages/PlayerToday.tsx", /\.eq\("program_source", "team"\)/, "team workout view excludes private family workouts");
expect("src/components/player/ParentProgramBuilderModal.tsx", /rpc\("replace_personal_training_program"/, "family plan uses atomic private storage");
reject("src/components/player/ParentProgramBuilderModal.tsx", /\.from\("practice_cards"\)/, "family plan never writes shared team cards");
expect("src/pages/SoloProgramBuilder.tsx", /rpc\("replace_personal_training_program"/, "solo program uses atomic storage");
expect("src/pages/QuickAssign.tsx", /rpc\("replace_team_practice_card"/, "quick assign uses an atomic write");
reject("src/pages/QuickAssign.tsx", /from\("practice_tasks"\)\.delete/, "quick assign never deletes tasks before a replacement succeeds");
expect("src/components/planning/ProgramBuilderWizard.tsx", /rpc\("create_team_training_program"/, "multi-week program uses an atomic write");
expect("src/components/planning/ProgramBuilderWizard.tsx", /navigate\(`\/teams\/\$\{teamId\}\/builder\/\$\{result\.first_plan_id\}`\)/, "coach is taken to review and publish Week 1");
expect("supabase/migrations/20260914053407_launch_journey_integrity.sql", /AS RESTRICTIVE FOR SELECT TO authenticated/, "legacy family privacy uses restrictive RLS");
expect("supabase/config.toml", /\[auth\.email\][\s\S]*enable_confirmations = false/, "new accounts do not require email confirmation");

console.log(`Launch journey checks passed (${checks.length}).`);
