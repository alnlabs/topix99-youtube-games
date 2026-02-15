// File: src/games/quiz/data/index.js

// games/quiz/data/index.js
// Merges all question categories into a single questions array

const generalKnowledgeMultilingual = require("./general-knowledge-multilingual");
const indianQuizQuestions = require("./indian-quiz-questions-multilingual");
const riddlesMultilingual = require("./riddles-multilingual");
const scienceQuizMultilingual = require("./science-quiz-multilingual");

// Define categories mapping
const categoryMap = {
  indianQuiz: indianQuizQuestions,
  generalKnowledge: generalKnowledgeMultilingual,
  riddles: riddlesMultilingual,
  science: scienceQuizMultilingual,
};

// Merge all question categories
const allQuestions = [];
const categorizedQuestions = {};

let currentGlobalIndex = 0;
Object.entries(categoryMap).forEach(([catName, questionsArr]) => {
  allQuestions.push(...questionsArr);
  categorizedQuestions[catName] = questionsArr.map((_, i) => currentGlobalIndex + i);
  currentGlobalIndex += questionsArr.length;
});

// Reassign IDs to ensure uniqueness across all categories
const questions = allQuestions.map((q, index) => ({
  ...q,
  id: index + 1, // Reassign IDs starting from 1
}));

module.exports = {
  questions,
  categorizedQuestions,
  categories: categoryMap,
};
