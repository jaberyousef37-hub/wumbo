import React, { createContext, useCallback, useContext, useState } from 'react';

type ProfileContextType = {
  name: string;
  username: string;
  hasCompletedSetup: boolean;
  setProfile: (name: string, username: string) => void;
};

const ProfileContext = createContext<ProfileContextType | null>(null);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [hasCompletedSetup, setHasCompletedSetup] = useState(true);

  const setProfile = useCallback((newName: string, newUsername: string) => {
    setName(newName.trim());
    setUsername(newUsername.trim().startsWith('@') ? newUsername.trim() : `@${newUsername.trim()}`);
    setHasCompletedSetup(true);
  }, []);

  return (
    <ProfileContext.Provider
      value={{
        name,
        username,
        hasCompletedSetup,
        setProfile,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile must be used within ProfileProvider');
  return ctx;
}
