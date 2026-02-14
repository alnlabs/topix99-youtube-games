/**
 * Quiz Game Utilities
 * Handles data transformation and normalization for quiz questions
 */

/**
 * Check if a value is a multilingual object
 */
function isMultilingual(value) {
  return (
    typeof value === "object" &&
    value !== null &&
    (value.telugu !== undefined || value.hindi !== undefined || value.english !== undefined)
  );
}

/**
 * Normalize a question text (string or multilingual object) to a standard format
 * Returns an object with:
 * - isMultilingual: boolean
 * - displayText: string (for regular) or object with {telugu, hindi, english} (for multilingual)
 */
function normalizeQuestionText(questionText) {
  if (isMultilingual(questionText)) {
    return {
      isMultilingual: true,
      displayText: {
        telugu: questionText.telugu || "",
        hindi: questionText.hindi || "",
        english: questionText.english || "",
      },
    };
  }
  return {
    isMultilingual: false,
    displayText: typeof questionText === "string" ? questionText : String(questionText),
  };
}

/**
 * Normalize a single option (string or multilingual object)
 */
function normalizeOption(option) {
  return normalizeQuestionText(option);
}

/**
 * Normalize a complete question object
 * Transforms multilingual questions into a normalized format
 */
function normalizeQuestion(question) {
  if (!question) return null;

  const normalizedQuestion = {
    ...question,
    _normalized: true,
  };

  // Normalize question text
  const questionNormalized = normalizeQuestionText(question.question);
  normalizedQuestion.isMultilingual = questionNormalized.isMultilingual;
  normalizedQuestion.displayText = questionNormalized.displayText;

  // Normalize options
  if (Array.isArray(question.options)) {
    normalizedQuestion.options = question.options.map((option, index) => {
      const optionNormalized = normalizeOption(option);
      return {
        isMultilingual: optionNormalized.isMultilingual,
        displayText: optionNormalized.displayText,
        originalIndex: index,
      };
    });
  }

  return normalizedQuestion;
}

/**
 * Get a display string for logging/debugging
 */
function getQuestionDisplayString(question) {
  if (!question) return "No question";

  if (typeof question.question === "object" && question.question !== null) {
    return question.question.english || question.question.telugu || question.question.hindi || "Multilingual Question";
  }
  return question.question || "Unknown question";
}

module.exports = {
  isMultilingual,
  normalizeQuestionText,
  normalizeOption,
  normalizeQuestion,
  getQuestionDisplayString,
};
