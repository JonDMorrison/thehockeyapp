import { useEffect, useState } from 'react';
import { applyTeamTheme, getStoredTeamTheme, getTeamPalette, TeamPalette } from '@/lib/themes';

export const useTeamTheme = () => {
  const [currentTheme, setCurrentTheme] = useState<string>(getStoredTeamTheme());
  const [palette, setPalette] = useState<TeamPalette>(getTeamPalette(currentTheme));

  useEffect(() => {
    applyTeamTheme(currentTheme);
    setPalette(getTeamPalette(currentTheme));
  }, [currentTheme]);

  const setTeamTheme = (paletteId: string) => {
    setCurrentTheme(paletteId);
    applyTeamTheme(paletteId);
  };

  return {
    currentTheme,
    palette,
    setTeamTheme,
  };
};
