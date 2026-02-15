// File: src/games/quiz/data/index.js

// games/quiz/data/index.js
// Merges all question categories into a single questions array

const generalKnowledgeMultilingual = require("./general-knowledge-multilingual");
const indianQuizQuestions = require("./indian-quiz-questions-multilingual");
const riddlesMultilingual = require("./riddles-multilingual");
const scienceQuizMultilingual = require("./science-quiz-multilingual");
const testLiveQuestions = require("./test-live-questions");

const QUESTION_SET = process.env.QUESTION_SET || "all";

// Define categories mapping
let categoryMap = {};

if (QUESTION_SET === "test") {
  categoryMap = {
    testLive: testLiveQuestions,
  };
  console.log(`[quiz-data] Loading TEST questions (${testLiveQuestions.length})`);
} else {
  categoryMap = {
    indianQuiz: indianQuizQuestions,
    generalKnowledge: generalKnowledgeMultilingual,
    riddles: riddlesMultilingual,
    science: scienceQuizMultilingual,
  };
  const total = Object.values(categoryMap).reduce((acc, arr) => acc + arr.length, 0);
  console.log(`[quiz-data] Loading ALL questions (${total})`);
}


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
