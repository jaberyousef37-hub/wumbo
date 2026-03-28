import React, { createContext, useCallback, useContext, useState } from 'react';

type OnboardingContextType = {
  hasSeenOnboarding: boolean;
  completeOnboarding: () => void;
};

const OnboardingContext = createContext<OnboardingContextType | null>(null);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);

  const completeOnboarding = useCallback(() => {
    setHasSeenOnboarding(true);
  }, []);

  return (
    <OnboardingContext.Provider value={{ hasSeenOnboarding, completeOnboarding }}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboarding must be used within OnboardingProvider');
  return ctx;
}
