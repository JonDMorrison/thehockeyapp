import { useEffect, useState } from 'react';
import { 
  applyTeamTheme, 
  getStoredTeamTheme, 
  getTeamPalette, 
  getStoredCustomColors,
  TeamPalette, 
  CustomColors,
  CUSTOM_PALETTE_ID 
} from '@/lib/themes';

export const useTeamTheme = () => {
  const [currentTheme, setCurrentTheme] = useState<string>(getStoredTeamTheme());
  const [customColors, setCustomColorsState] = useState<CustomColors | null>(getStoredCustomColors());
  const [palette, setPalette] = useState<TeamPalette>(getTeamPalette(currentTheme, customColors));

  useEffect(() => {
    applyTeamTheme(currentTheme, customColors);
    setPalette(getTeamPalette(currentTheme, customColors));
  }, [currentTheme, customColors]);

  const setTeamTheme = (paletteId: string, colors?: CustomColors | null) => {
    setCurrentTheme(paletteId);
    if (paletteId === CUSTOM_PALETTE_ID && colors) {
      setCustomColorsState(colors);
      applyTeamTheme(paletteId, colors);
    } else {
      applyTeamTheme(paletteId);
    }
  };

  const setCustomColors = (colors: CustomColors) => {
    setCustomColorsState(colors);
    if (currentTheme === CUSTOM_PALETTE_ID) {
      applyTeamTheme(CUSTOM_PALETTE_ID, colors);
      setPalette(getTeamPalette(CUSTOM_PALETTE_ID, colors));
    }
  };

  return {
    currentTheme,
    palette,
    customColors,
    setTeamTheme,
    setCustomColors,
  };
};
