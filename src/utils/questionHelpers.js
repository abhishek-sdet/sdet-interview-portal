/**
 * Question Helpers Utility
 * 
 * Helper functions for organizing and grouping questions.
 * Pure functions with no React dependencies.
 */

/**
 * Group questions by criteria, then by set
 * Returns object with criteria as keys, each containing sets
 */
export function groupQuestionsByCriteriaAndSet(questions) {
    const grouped = {};

    questions.forEach(q => {
        const criteriaId = q.criteria_id;
        const setName = q.set_name || 'Default Set';

        if (!grouped[criteriaId]) {
            grouped[criteriaId] = {};
        }

        if (!grouped[criteriaId][setName]) {
            grouped[criteriaId][setName] = {
                name: setName,
                type: q.set_type || 'mandatory',
                questions: [],
                stats: {
                    total: 0,
                    active: 0,
                    withAnswers: 0
                }
            };
        }

        grouped[criteriaId][setName].questions.push(q);
        grouped[criteriaId][setName].stats.total++;
        if (q.is_active) grouped[criteriaId][setName].stats.active++;
        if (q.correct_answer) grouped[criteriaId][setName].stats.withAnswers++;
    });

    return grouped;
}

/**
 * Group questions by set (legacy function for backward compatibility)
 * Returns array of set objects
 */
export function groupQuestionsBySet(questions) {
    const sets = {};

    questions.forEach(q => {
        const setName = q.set_name || 'Default Set';

        if (!sets[setName]) {
            sets[setName] = {
                name: setName,
                type: q.set_type || 'mandatory',
                questions: [],
                stats: {
                    total: 0,
                    active: 0,
                    withAnswers: 0
                }
            };
        }

        sets[setName].questions.push(q);
        sets[setName].stats.total++;
        if (q.is_active) sets[setName].stats.active++;
        if (q.correct_answer) sets[setName].stats.withAnswers++;
    });

    return Object.values(sets).sort((a, b) => {
        // Sort by set name
        return a.name.localeCompare(b.name);
    });
}

/**
 * Get criteria label from criteria name
 * Returns 'Fresher', 'Experienced', or 'Both'
 */
export function getCriteriaLabel(criteriaName) {
    if (!criteriaName) return 'Both';
    if (criteriaName.includes('Fresher')) return 'Fresher';
    if (criteriaName.includes('Experienced')) return 'Experienced';
    return 'Both';
}

/**
 * Fisher-Yates Shuffle Algorithm
 * Randomizes the order of elements in an array.
 * @param {Array} array - The array to shuffle
 * @returns {Array} A new shuffled array
 */
export function shuffleArray(array) {
    if (!array || !Array.isArray(array)) return [];
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}
