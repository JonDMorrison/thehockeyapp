interface MatchableTemplate {
  age_divisions: string[];
  levels: string[];
}

export function rankProgramTemplates<T extends MatchableTemplate>(
  templates: T[],
  ageDivision?: string | null,
  level?: string | null,
): T[] {
  if (!ageDivision && !level) return templates;

  const scored = templates.map((template, index) => {
    const ageMatches = Boolean(ageDivision && template.age_divisions.includes(ageDivision));
    const levelMatches = Boolean(level && template.levels.includes(level));

    let score = 3;
    if (ageDivision && level && ageMatches && levelMatches) score = 0;
    else if (ageMatches) score = 1;
    else if (levelMatches) score = 2;

    return { template, index, score };
  });

  const matching = scored.filter(({ score }) => score < 3);
  const candidates = matching.length > 0 ? matching : scored;

  return candidates
    .sort((a, b) => a.score - b.score || a.index - b.index)
    .map(({ template }) => template);
}
