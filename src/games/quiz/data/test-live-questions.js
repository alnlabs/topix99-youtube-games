// File: src/games/quiz/data/test-live-questions.js
// A small set of high-quality questions for live stream testing

module.exports = [
  {
    id: 1,
    question: {
      telugu: "భారతదేశ రాజధాని ఏది?",
      hindi: "भारत की राजधानी क्या है?",
      english: "What is the capital of India?",
    },
    options: [
      { telugu: "ముంబై", hindi: "मुंबई", english: "Mumbai" },
      { telugu: "కోల్కతా", hindi: "कोलकाता", english: "Kolkata" },
      { telugu: "న్యూ ఢిల్లీ", hindi: "नई दिल्ली", english: "New Delhi" },
      { telugu: "చెన్నై", hindi: "चेन्नई", english: "Chennai" }
    ],
    correctIndex: 2,
    timeLimit: 20,
    category: "General",
  },
  {
    id: 2,
    question: {
      telugu: "సౌర కుటుంబంలో అతిపెద్ద గ్రహం ఏది?",
      hindi: "सौरमंडल का सबसे बड़ा ग्रह कौन सा है?",
      english: "Which is the largest planet in our solar system?",
    },
    options: [
      { telugu: "శని", hindi: "शनि", english: "Saturn" },
      { telugu: "గురుడు", hindi: "बृहस्पति", english: "Jupiter" },
      { telugu: "భూమి", hindi: "पृथ्वी", english: "Earth" },
      { telugu: "మంగళ", hindi: "मंगल", english: "Mars" }
    ],
    correctIndex: 1,
    timeLimit: 20,
    category: "Science",
  },
  {
    id: 3,
    question: {
      telugu: "మానవ శరీరంలో అతిపెద్ద అవయవం ఏది?",
      hindi: "मानव शरीर का सबसे बड़ा अंग कौन सा है?",
      english: "What is the largest organ in the human body?",
    },
    options: [
      { telugu: "గుండె", hindi: "दिल", english: "Heart" },
      { telugu: "కాలేయం", hindi: "यकृत", english: "Liver" },
      { telugu: "చర్మం", hindi: "त्वचा", english: "Skin" },
      { telugu: "మెదడు", hindi: "मस्तिष्क", english: "Brain" }
    ],
    correctIndex: 2,
    timeLimit: 20,
    category: "Science",
  },
  {
    id: 4,
    question: {
      telugu: "భారతీయ జాతీయ జంతువు ఏది?",
      hindi: "भारत का राष्ट्रीय पशु कौन सा है?",
      english: "Which is the national animal of India?",
    },
    options: [
      { telugu: "సింహం", hindi: "शेर", english: "Lion" },
      { telugu: "పులి", hindi: "బ్రాడ్", english: "Tiger" },
      { telugu: "ఏనుగు", hindi: "हाथी", english: "Elephant" },
      { telugu: "చిరుతపులి", hindi: "तेंदुआ", english: "Leopard" }
    ],
    correctIndex: 1,
    timeLimit: 20,
    category: "General",
  }
];
