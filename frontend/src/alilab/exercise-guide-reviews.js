import reviews from './exercise-guide-reviews.json' with { type: 'json' }

export function exerciseGuideReview(exercise) {
  if (!exercise || exercise.custom || !Object.hasOwn(reviews, exercise.id)) return null
  return reviews[exercise.id]
}
