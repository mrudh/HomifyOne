/* eslint-disable no-unused-vars */
export function buildProfile(answers, plot) {
  const styleMap = { modern: 'modern', minimal: 'minimal', classic: 'classic', scandi: 'scandi', cosy: 'cosy', bold: 'bold', unsure: '' };
  const budgetMap = { low: [0, 1000], little: [0, 3000], balanced: [0, 5000], invest: [0, 7500], unsure: [0, 0] };
  const [budgetMin, budgetMax] = budgetMap[answers?.budget] || [0, 0];
  const roomAnswers = answers?.roomDetails || {};
  return {
    buyer_type: answers?.household || '',
    household_size: answers?.household || '',
    build_stage: 'Handover / ready to move in',
    upgrade_categories: answers?.lifestyleTraits || [],
    priorities: answers?.priorities || [],
    preferred_style: styleMap[answers?.style] || '',
    budget_min: budgetMin,
    budget_max: budgetMax,
    home_area: answers?.primaryRoom || '',
    bedroom_users: answers?.household || '',
    wardrobe_need: roomAnswers['Storage & wardrobes'] || '',
    kitchen_usage: roomAnswers['Kitchen'] || '',
    bathroom_priority: roomAnswers['Bathroom'] || '',
    flooring_area: roomAnswers['Flooring throughout'] || '',
    garden_priority: roomAnswers['Garden / outdoor space'] || '',
    sustainability_interest: (answers?.lifestyleTraits || []).includes('eco') ? 'eco and sustainability' : '',
    smart_home_need: (answers?.lifestyleTraits || []).includes('smart_home') ? 'smart home' : '',
    additional_notes: answers?.buyerProfile || '',
  };
}