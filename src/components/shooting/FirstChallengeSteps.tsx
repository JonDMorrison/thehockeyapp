import { SetupProgress } from "@/components/onboarding/SetupProgress";

export function FirstChallengeSteps({ step }: { step: 1 | 2 | 3 }) {
  return (
    <SetupProgress step={step} labels={["Name team", "Pick dates", "Invite"]} />
  );
}
