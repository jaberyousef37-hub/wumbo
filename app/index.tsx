import { Redirect } from 'expo-router';

import OnboardingSlides from '@/components/onboarding-slides';
import { useOnboarding } from '@/contexts/onboarding-context';

export default function Index() {
  const { hasSeenOnboarding } = useOnboarding();
  if (!hasSeenOnboarding) {
    return <OnboardingSlides />;
  }
  return <Redirect href="/(tabs)/home" />;
}
