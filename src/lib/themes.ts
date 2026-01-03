// Team Palette Registry - NHL City-Inspired Themes
// Colors are tasteful representatives, not official brand colors

export interface TeamPalette {
  id: string;
  displayName: string;
  primary: string;
  secondary: string;
  tertiary: string;
}

export const teamPalettes: TeamPalette[] = [
  {
    id: "toronto",
    displayName: "Toronto",
    primary: "221 83% 53%",    // Royal blue
    secondary: "0 0% 100%",     // White
    tertiary: "221 70% 45%",    // Deeper blue
  },
  {
    id: "montreal",
    displayName: "Montreal",
    primary: "0 72% 51%",       // Canadiens red
    secondary: "221 83% 53%",   // Blue
    tertiary: "0 0% 100%",      // White
  },
  {
    id: "boston",
    displayName: "Boston",
    primary: "45 93% 47%",      // Gold
    secondary: "0 0% 13%",      // Black
    tertiary: "45 80% 55%",     // Lighter gold
  },
  {
    id: "chicago",
    displayName: "Chicago",
    primary: "0 72% 51%",       // Red
    secondary: "0 0% 13%",      // Black
    tertiary: "0 0% 100%",      // White
  },
  {
    id: "newyork",
    displayName: "New York",
    primary: "221 83% 53%",     // Blue
    secondary: "0 72% 51%",     // Red
    tertiary: "0 0% 100%",      // White
  },
  {
    id: "detroit",
    displayName: "Detroit",
    primary: "0 72% 51%",       // Red
    secondary: "0 0% 100%",     // White
    tertiary: "0 60% 45%",      // Darker red
  },
  {
    id: "vancouver",
    displayName: "Vancouver",
    primary: "221 70% 40%",     // Navy blue
    secondary: "160 84% 39%",   // Green
    tertiary: "0 0% 100%",      // White
  },
  {
    id: "edmonton",
    displayName: "Edmonton",
    primary: "25 95% 53%",      // Orange
    secondary: "221 83% 53%",   // Blue
    tertiary: "0 0% 100%",      // White
  },
  {
    id: "calgary",
    displayName: "Calgary",
    primary: "0 72% 51%",       // Red
    secondary: "45 93% 47%",    // Gold
    tertiary: "0 0% 13%",       // Black
  },
  {
    id: "winnipeg",
    displayName: "Winnipeg",
    primary: "221 70% 35%",     // Navy
    secondary: "0 0% 100%",     // White
    tertiary: "221 60% 50%",    // Lighter blue
  },
  {
    id: "ottawa",
    displayName: "Ottawa",
    primary: "0 72% 45%",       // Red
    secondary: "0 0% 13%",      // Black
    tertiary: "45 70% 50%",     // Gold
  },
  {
    id: "losangeles",
    displayName: "Los Angeles",
    primary: "0 0% 20%",        // Charcoal
    secondary: "0 0% 100%",     // White
    tertiary: "0 0% 45%",       // Gray
  },
  {
    id: "pittsburgh",
    displayName: "Pittsburgh",
    primary: "45 93% 47%",      // Gold
    secondary: "0 0% 13%",      // Black
    tertiary: "0 0% 100%",      // White
  },
  {
    id: "philadelphia",
    displayName: "Philadelphia",
    primary: "25 95% 53%",      // Orange
    secondary: "0 0% 13%",      // Black
    tertiary: "0 0% 100%",      // White
  },
  {
    id: "tampabay",
    displayName: "Tampa Bay",
    primary: "221 83% 53%",     // Blue
    secondary: "0 0% 100%",     // White
    tertiary: "0 0% 13%",       // Black
  },
];

export const getTeamPalette = (id: string): TeamPalette => {
  return teamPalettes.find(p => p.id === id) || teamPalettes[0];
};

export const applyTeamTheme = (paletteId: string): void => {
  const palette = getTeamPalette(paletteId);
  const root = document.documentElement;
  
  root.style.setProperty('--team-primary', palette.primary);
  root.style.setProperty('--team-secondary', palette.secondary);
  root.style.setProperty('--team-tertiary', palette.tertiary);
  
  // Persist selection
  localStorage.setItem('selected-team-theme', paletteId);
};

export const getStoredTeamTheme = (): string => {
  return localStorage.getItem('selected-team-theme') || 'toronto';
};
