#!/usr/bin/env node

const { spawn } = require("child_process");

const APPS = {
  luckywheel: "topix99-luckywheel",
  "luckywheel:test": "topix99-luckywheel-test",
  quiz: "topix99-quiz-real-live",
  "quiz:real-live": "topix99-quiz-real-live",
  "quiz:test-live": "topix99-quiz-test-live",
  "quiz:test": "topix99-quiz-test",
};

const VALID_ACTIONS = new Set(["start", "stop", "restart", "delete", "logs"]);

function printHelp() {
  console.log(`
Usage:
  npm run pm2 -- --action <start|stop|restart|delete|logs> --target <name>
  npm run pm2 -- start quiz

Targets:
  luckywheel
  luckywheel:test
  quiz
  quiz:real-live
  quiz:test-live
  quiz:test

Examples:
  npm run pm2 -- --action start --target luckywheel
  npm run pm2 -- --action logs --target quiz:test
  npm run pm2 -- --action start --target quiz --question-set=science,gk
  npm run pm2 -- --action delete --target quiz
`.trim());
}

function runPm2(args, extraEnv = {}) {
  const child = spawn("pm2", args, {
    stdio: "inherit",
    env: { ...process.env, ...extraEnv },
  });

  child.on("error", (error) => {
    console.error(`[pm2-cli] Failed to execute pm2: ${error.message}`);
    process.exit(1);
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exit(code ?? 1);
  });
}

function readValue(args, index, flag) {
  const value = args[index + 1];
  if (!value || value.startsWith("-")) {
    throw new Error(`Missing value for ${flag}`);
  }
  return value;
}

function parseArgs(args) {
  let action = null;
  let target = null;
  let questionSet = null;
  let help = false;
  const positional = [];

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--help" || arg === "-h" || arg === "--options") {
      help = true;
      continue;
    }
    if (arg.startsWith("--action=")) {
      action = arg.slice("--action=".length).trim();
      continue;
    }
    if (arg === "--action" || arg === "-a") {
      action = readValue(args, i, "--action");
      i += 1;
      continue;
    }
    if (arg.startsWith("--target=") || arg.startsWith("--game=")) {
      const key = arg.startsWith("--target=") ? "--target=" : "--game=";
      target = arg.slice(key.length).trim();
      continue;
    }
    if (arg === "--target" || arg === "--game" || arg === "-t" || arg === "-g") {
      target = readValue(args, i, arg);
      i += 1;
      continue;
    }
    if (arg.startsWith("--question-set=")) {
      questionSet = arg.slice("--question-set=".length).trim();
      continue;
    }
    if (arg === "--question-set" || arg === "--questions") {
      questionSet = readValue(args, i, arg).trim();
      i += 1;
      continue;
    }
    if (arg.startsWith("-")) {
      throw new Error(`Unknown option: ${arg}`);
    }
    positional.push(arg);
  }

  if (!action && positional.length > 0) action = positional[0];
  if (!target && positional.length > 1) target = positional[1];

  return { action, target, help, questionSet };
}

function main() {
  let action;
  let target;
  let help;
  let questionSet;
  try {
    ({ action, target, help, questionSet } = parseArgs(process.argv.slice(2)));
  } catch (error) {
    console.error(`[pm2-cli] ${error.message}`);
    printHelp();
    process.exit(1);
  }

  if (!action || help) {
    printHelp();
    return;
  }

  if (!VALID_ACTIONS.has(action)) {
    console.error(`[pm2-cli] Invalid action "${action}"`);
    printHelp();
    process.exit(1);
  }

  if (!target) {
    console.error("[pm2-cli] Missing target");
    printHelp();
    process.exit(1);
  }

  if (questionSet) {
    const normalized = questionSet
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    if (normalized.length === 0) {
      console.error('[pm2-cli] Invalid --question-set. Use "all" or comma-separated values.');
      process.exit(1);
    }
    if (normalized.length === 1 && normalized[0].toLowerCase() !== "all") {
      console.error('[pm2-cli] Invalid --question-set. Use "all" or comma-separated values.');
      process.exit(1);
    }
    questionSet = normalized.join(",");

    if (!target.startsWith("quiz")) {
      console.error("[pm2-cli] --question-set is supported only for quiz targets.");
      process.exit(1);
    }

    if (action !== "start" && action !== "restart") {
      console.error("[pm2-cli] --question-set works only with start or restart.");
      process.exit(1);
    }
  }

  if (action === "start") {
    const appName = APPS[target];
    if (!appName) {
      console.error(`[pm2-cli] Unknown target "${target}"`);
      printHelp();
      process.exit(1);
    }
    runPm2(
      ["start", "ecosystem.config.js", "--only", appName],
      questionSet ? { QUESTION_SET: questionSet } : {}
    );
    return;
  }

  if (action === "restart") {
    const appName = APPS[target];
    if (!appName) {
      console.error(`[pm2-cli] Unknown target "${target}"`);
      printHelp();
      process.exit(1);
    }

    const restartArgs = ["restart", appName, "--update-env"];
    runPm2(restartArgs, questionSet ? { QUESTION_SET: questionSet } : {});
    return;
  }

  const appName = APPS[target];
  if (!appName) {
    console.error(`[pm2-cli] Unknown target "${target}"`);
    printHelp();
    process.exit(1);
  }

  runPm2([action, appName]);
}

main();
