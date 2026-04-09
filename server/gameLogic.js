function isPlacementCorrect(timeline, positionIndex, actualYear) {
  // Empty timeline — first card is always correct
  if (timeline.length === 0) return true;

  const before = positionIndex > 0 ? timeline[positionIndex - 1].year : -Infinity;
  const after = positionIndex < timeline.length ? timeline[positionIndex].year : Infinity;

  return actualYear >= before && actualYear <= after;
}

module.exports = { isPlacementCorrect };
