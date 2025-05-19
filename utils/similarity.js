function computeScore(resultTitle, resultYear, queryTitle, expectedYear) {
  const titleSimilarity = getSimilarity(resultTitle, queryTitle);
  const yearDiff = Math.abs(parseInt(resultYear) - parseInt(expectedYear));

  // Exact match on title and year
  if (titleSimilarity === 1.0 && yearDiff === 0) {
    return 1.0; // Highest possible score
  }

  // Exact title match with year difference
  if (titleSimilarity === 1.0) {
    return 0.9 - (yearDiff * 0.05); // Decrease score based on year difference
  }

  // Exact year match with partial title similarity
  if (yearDiff === 0) {
    return 0.8 * titleSimilarity; // Scale score based on title similarity
  }

  // Partial matches
  return titleSimilarity * (1 - (yearDiff * 0.1)); // Penalize based on year difference
}

function getSimilarity(s1, s2) {
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length <= s2.length ? s1 : s2;
  const longerLength = longer.length;
  if (longerLength === 0) return 1.0;
  
  return (longerLength - editDistance(longer, shorter)) / parseFloat(longerLength);
}

function editDistance(s1, s2) {
  s1 = s1.toLowerCase();
  s2 = s2.toLowerCase();

  const costs = [];
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else {
        if (j > 0) {
          let newValue = costs[j - 1];
          if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
          }
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
    }
    if (i > 0) costs[s2.length] = lastValue;
  }
  return costs[s2.length];
}

module.exports = { computeScore, getSimilarity };
