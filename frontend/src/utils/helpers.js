export const outcomeClass = (o) => {
  const map = { positive: 'outcome-positive', neutral: 'outcome-neutral', negative: 'outcome-negative', follow_up_required: 'outcome-follow_up_required' };
  return map[o] || 'outcome-neutral';
};

export const getSentimentIcon = (sentiment) => {
  const s = (sentiment || '').toLowerCase();
  if (s.includes('pos')) return '🟢';
  if (s.includes('neg')) return '🔴';
  return '🟡';
};

export const getTypeIcon = (type) => {
  const t = (type || '').toLowerCase();
  if (t === 'visit') return '🏥';
  if (t === 'call') return '📞';
  if (t === 'email') return '📧';
  if (t === 'conference') return '👥';
  if (t === 'webinar') return '💻';
  return '📝';
};
