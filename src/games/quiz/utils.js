// File: src/games/quiz/utils.js

/**
 * Quiz Game Utilities
 * Handles data transformation and normalization for quiz questions
 */

/**
 * Check if a value is a multilingual object
 */
function isMultilingual(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const keys = Object.keys(value);
  const commonLangs = [
    "en", "english", "hi", "hindi", "te", "telugu",
    "ta", "tamil", "ml", "malayalam", "kn", "kannada",
    "mr", "marathi", "bn", "bengali", "ur", "urdu", "pa", "punjabi"
  ];

  return keys.some(key => commonLangs.includes(key.toLowerCase()));
}

/**
 * Normalize a question object to ensure consistent structure
 */
function normalizeQuestion(question) {
  // If question is a string, convert to object with English text
  if (typeof question === "string") {
    return {
      question: { en: question },
      options: [],
      correctIndex: 0,
      category: "general",
    };
  }

  // If options exist but are not normalized, normalize them
  if (question.options) {
    question.options = question.options.map((opt) => {
      if (typeof opt === "string") {
        return { en: opt };
      }
      return opt;
    });
  }

  return question;
}

/**
 * Get text in the requested language, falling back to English
 */
function getLocalizedText(text, lang = "en") {
  if (typeof text === "string") {
    return text;
  }

  if (isMultilingual(text)) {
    return text[lang] || text.en || Object.values(text)[0] || "";
  }

  return String(text || "");
}

/**
 * Get a normalized multilingual object {telugu, hindi, english}
 */
function getMultilingualData(value) {
  if (typeof value === "string") {
    return { english: value, hindi: "", telugu: "" };
  }

  if (!value || typeof value !== "object") {
    return { english: String(value || ""), hindi: "", telugu: "" };
  }

  const data = {
    english: value.english || value.en || "",
    hindi: value.hindi || value.hi || "",
    telugu: value.telugu || value.te || "",
  };

  // If we have none of the known keys, but have other keys, use first one for English
  if (!data.english && !data.hindi && !data.telugu) {
    const val = Object.values(value).find((v) => typeof v === "string");
    data.english = val || "";
  }

  return data;
}

/**
 * Transform a question to a full multilingual object
 */
function transformQuestionMultilingual(question) {
  const normalized = normalizeQuestion(question);

  return {
    questionText: getMultilingualData(normalized.question),
    options: (normalized.options || []).map((option) =>
      getMultilingualData(option)
    ),
    correctIndex: normalized.correctIndex,
    category: normalized.category,
    difficulty: normalized.difficulty,
  };
}

/**
 * Get a display string for a question (for logging purposes)
 */
function getQuestionDisplayString(question) {
  if (typeof question === "string") {
    return question;
  }

  if (question.question) {
    const q = question.question;
    // Handle multilingual question object
    if (typeof q === "object" && q !== null) {
      return (
        q.en ||
        q.english ||
        q.hi ||
        q.hindi ||
        q.te ||
        q.telugu ||
        Object.values(q).find((v) => typeof v === "string") ||
        ""
      );
    }
    return String(q);
  }

  return String(question);
}

module.exports = {
  isMultilingual,
  normalizeQuestion,
  getLocalizedText,
  getMultilingualData,
  transformQuestionMultilingual,
  getQuestionDisplayString,
};
