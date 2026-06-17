export function createSearchMatcher(query) {
  const value = String(query || "")
    .trim()
    .toLowerCase();
  const normalizedTerms = value.split(/\s+/).filter(Boolean);

  return (item) => {
    if (normalizedTerms.length === 0 || value.length < 2) {
      return true;
    }

    const fullName = String(item.fullName || "").toLowerCase();
    const phone = String(item.phone || "").toLowerCase();
    const nameTokens = fullName.split(/\s+/).filter(Boolean);

    return normalizedTerms.every((term) => {
      const nameMatch = nameTokens.some((token) => {
        if (term.length < 3) {
          return token.startsWith(term);
        }
        return token.startsWith(term) || token.includes(term);
      });
      const phoneMatch = phone.startsWith(term);
      return nameMatch || phoneMatch;
    });
  };
}
