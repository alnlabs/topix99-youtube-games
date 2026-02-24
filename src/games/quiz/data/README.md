## Quiz Data Structure

This folder is organized as:

- `categories/`
  - Single source of truth for all quiz banks.
  - Includes:
    - Core banks (generalKnowledge, indianQuiz, riddles, science, testLive)
    - Expanded multilingual banks (25 category files, 100 each)
  - `index.js` exports all banks as one object.

- `index.js`
  - Unified loader used by the quiz game.
  - Applies `QUESTION_SET` filtering and aliases.
  - Merges selected banks into the runtime question list.
