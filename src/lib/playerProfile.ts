export const NHL_TEAMS = [
  "Anaheim Ducks",
  "Arizona Coyotes",
  "Boston Bruins",
  "Buffalo Sabres",
  "Calgary Flames",
  "Carolina Hurricanes",
  "Chicago Blackhawks",
  "Colorado Avalanche",
  "Columbus Blue Jackets",
  "Dallas Stars",
  "Detroit Red Wings",
  "Edmonton Oilers",
  "Florida Panthers",
  "Los Angeles Kings",
  "Minnesota Wild",
  "Montreal Canadiens",
  "Nashville Predators",
  "New Jersey Devils",
  "New York Islanders",
  "New York Rangers",
  "Ottawa Senators",
  "Philadelphia Flyers",
  "Pittsburgh Penguins",
  "San Jose Sharks",
  "Seattle Kraken",
  "St. Louis Blues",
  "Tampa Bay Lightning",
  "Toronto Maple Leafs",
  "Utah Hockey Club",
  "Vancouver Canucks",
  "Vegas Golden Knights",
  "Washington Capitals",
  "Winnipeg Jets",
] as const;

export const PLAYER_POSITIONS = [
  { value: "forward", label: "Forward" },
  { value: "defence", label: "Defence" },
  { value: "goalie", label: "Goalie" },
  { value: "unsure", label: "Not sure yet" },
] as const;

export type PlayerPosition = (typeof PLAYER_POSITIONS)[number]["value"];

export function getPlayerPositionLabel(position?: string | null) {
  return PLAYER_POSITIONS.find((option) => option.value === position)?.label ?? null;
}
