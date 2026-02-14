// games/quiz/data/index.js
// Merges all question categories into a single questions array

const generalKnowledge = require("./general-knowledge");
const indianQuiz100Questions = require("./indian-quiz-100-questions");
const riddlesMultilingual = require("./riddles-multilingual");
// Merge all question categories
// Each category should export an array of questions
const allQuestions = [
  ...indianQuiz100Questions,
  ...generalKnowledge,
  ...riddlesMultilingual,
  // Add more categories here as needed:
  // ...science,
  // ...history,
  // ...technology,
  // etc.
];

// Reassign IDs to ensure uniqueness across all categories
// This ensures questions have sequential IDs even when merged
const questions = allQuestions.map((q, index) => ({
  ...q,
  id: index + 1, // Reassign IDs starting from 1
}));

module.exports = {
  questions,
  // Export individual categories for reference
  categories: {
    generalKnowledge,
    indianQuiz: indianQuiz100Questions,
    riddles: riddlesMultilingual,
  },
};
