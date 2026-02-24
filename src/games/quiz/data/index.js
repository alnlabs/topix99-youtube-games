// File: src/games/quiz/data/index.js

// games/quiz/data/index.js
// Merges all question categories into a single questions array

<<<<<<< Updated upstream
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
=======
const allCategories = require("./categories");

const QUESTION_SET = process.env.QUESTION_SET || "all";

const categoryAliases = {
  indian: "indianQuiz",
  indianquiz: "indianQuiz",
  general: "generalKnowledge",
  generalknowledge: "generalKnowledge",
  gk: "generalKnowledge",
  riddles: "riddles",
  science: "science",
  test: "testLive",
  testlive: "testLive",
  "current-affairs": "currentAffairs",
  currentaffairs: "currentAffairs",
  politics: "indianPoliticsCivics",
  civics: "indianPoliticsCivics",
  worldgeo: "worldGeography",
  indiageo: "indianGeography",
  history: "history",
  sciencefundamentals: "scienceFundamentals",
  space: "spaceAstronomy",
  astronomy: "spaceAstronomy",
  ai: "technologyAI",
  tech: "technologyAI",
  cybersecurity: "computerSafety",
  computersafety: "computerSafety",
  math: "mathPuzzles",
  logic: "logicalReasoning",
  brainteasers: "riddlesBrainTeasers",
  movies: "movies",
  music: "music",
  sports: "sports",
  mythology: "mythology",
  health: "healthNutrition",
  nutrition: "healthNutrition",
  environment: "environmentClimate",
  climate: "environmentClimate",
  inventions: "inventionsDiscoveries",
  discoveries: "inventionsDiscoveries",
  personalities: "personalitiesQuotes",
  quotes: "personalitiesQuotes",
  flags: "flagsCapitalsCurrencies",
  capitals: "flagsCapitalsCurrencies",
  currencies: "flagsCapitalsCurrencies",
};

function normalizeCategoryName(value) {
  const key = String(value || "").trim().toLowerCase();
  return categoryAliases[key] || value;
}

function buildCategoryMap(rawQuestionSet) {
  const input = String(rawQuestionSet || "all").trim();
  if (!input || input.toLowerCase() === "all") {
    // Keep "all" focused on curated core question banks only.
    const map = {
      generalKnowledge: allCategories.generalKnowledge,
      indianQuiz: allCategories.indianQuiz,
      riddles: allCategories.riddles,
      science: allCategories.science,
    };
    return {
      map,
      mode: "all",
    };
  }
>>>>>>> Stashed changes

  const requested = input
    .split(",")
    .map((item) => normalizeCategoryName(item.trim()))
    .filter(Boolean);

  if (requested.length === 0) {
    throw new Error(
      '[quiz-data] Invalid QUESTION_SET. Use "all" or comma-separated category names.'
    );
  }

  const uniqueRequested = [...new Set(requested)];
  const invalid = uniqueRequested.filter((name) => !allCategories[name]);
  if (invalid.length > 0) {
    throw new Error(
      `[quiz-data] Invalid QUESTION_SET categories: ${invalid.join(", ")}. Valid: ${Object.keys(
        allCategories
      ).join(", ")}`
    );
  }

  const map = {};
  uniqueRequested.forEach((name) => {
    map[name] = allCategories[name];
  });

  return { map, mode: uniqueRequested.join(",") };
}

const { map: categoryMap, mode } = buildCategoryMap(QUESTION_SET);
const total = Object.values(categoryMap).reduce((acc, arr) => acc + arr.length, 0);
console.log(
  `[quiz-data] Loading questions set="${mode}" categories=${Object.keys(categoryMap).join(
    ","
  )} total=${total}`
);

function shuffleInPlace(items) {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

function shuffleQuestionOptions(question) {
  const originalOptions = Array.isArray(question.options) ? [...question.options] : [];
  if (originalOptions.length < 2) {
    return { ...question };
  }

  const indexedOptions = originalOptions.map((opt, idx) => ({ opt, idx }));
  shuffleInPlace(indexedOptions);

  const shuffledOptions = indexedOptions.map((item) => item.opt);
  const newCorrectIndex = indexedOptions.findIndex(
    (item) => item.idx === question.correctIndex
  );

  return {
    ...question,
    options: shuffledOptions,
    correctIndex: newCorrectIndex,
  };
}

// Build one full shuffled cycle:
// 1) merge selected categories
// 2) shuffle options in each question (while preserving answer correctness)
// 3) shuffle complete question order
const mergedQuestions = [];
Object.entries(categoryMap).forEach(([, questionsArr]) => {
  mergedQuestions.push(...questionsArr);
});

const optionShuffledQuestions = mergedQuestions.map((q) => shuffleQuestionOptions(q));
const shuffledQuestions = shuffleInPlace(optionShuffledQuestions);

// Reassign IDs and build category index map against shuffled order
const questions = shuffledQuestions.map((q, index) => ({
  ...q,
  id: index + 1,
}));

const categorizedQuestions = {};
questions.forEach((q, idx) => {
  const cat = q.category || "uncategorized";
  if (!categorizedQuestions[cat]) categorizedQuestions[cat] = [];
  categorizedQuestions[cat].push(idx);
});

module.exports = {
  questions,
  categorizedQuestions,
  categories: categoryMap,
};
