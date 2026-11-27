import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '../services/api';
import { useAppSelector } from './hooks';
import { selectCurrentUser } from './authSlice';

export type CompanyProfile = {
  companyName: string;
  managerName: string | null;
  managerEmail: string | null;
  managerPhone: string | null;
};

type CompanyProfileContextValue = {
  profile: CompanyProfile | null;
  refresh: () => Promise<CompanyProfile | null>;
  setProfile: (profile: CompanyProfile | null) => void;
};

const CompanyProfileContext = createContext<CompanyProfileContextValue>({
  profile: null,
  refresh: async () => null,
  setProfile: () => {},
});

export function CompanyProfileProvider({ children }: { children: React.ReactNode }) {
  const user = useAppSelector(selectCurrentUser);
  const [profile, setProfile] = useState<CompanyProfile | null>(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setProfile(null);
      return null;
    }
    try {
      const response = await api.get<CompanyProfile | null>('/company-profile');
      setProfile(response.data ?? null);
      return response.data ?? null;
    } catch {
      setProfile(null);
      return null;
    }
  }, [user?.id, user?.role]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <CompanyProfileContext.Provider value={{ profile, refresh, setProfile }}>
      {children}
    </CompanyProfileContext.Provider>
  );
}

export const useCompanyProfile = () => useContext(CompanyProfileContext);
