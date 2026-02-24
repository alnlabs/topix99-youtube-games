#!/usr/bin/env node

const path = require("path");
const { spawn } = require("child_process");

const VALID_GAMES = new Set(["quiz", "luckywheel", "default"]);
const TEST_ENTRYPOINTS = {
  quiz: "src/games/quiz/test.js",
  luckywheel: "src/games/luckywheel/test.js",
};

function printHelp() {
  console.log(`
Usage:
  npm run game -- --game <quiz|luckywheel|default> [options]
  npm run game -- --game quiz --mode test

Options:
  --game=<name>         Game: quiz | luckywheel | default
  --mode=<live|test>    Run mode (default: live)
  --test                Shortcut for --mode=test
  --live                Shortcut for --mode=live
  --question-set=<value> Quiz only: "all" or comma-separated (e.g. science,gk)
  --allow-non-pm2       Allow running live mode without PM2
  --admin-only          Start server in admin-only mode
  --clean-db            Clean DB before starting (test/live mapped automatically)
  --port=<number>       Override PORT (live) or TEST_PORT (test)
  --env=KEY=VALUE       Extra environment variable (repeatable)
  --help, --options     Show this message

Examples:
  npm run game -- --game quiz
  npm run game -- --game luckywheel --mode test
  npm run game -- --game quiz --question-set=science,gk
  npm run game -- --game luckywheel --mode test --clean-db
  npm run game -- --game quiz --env=LOG_LEVEL=DEBUG
`.trim());
}

function readValue(args, index, flag) {
  const value = args[index + 1];
  if (!value || value.startsWith("-")) {
    throw new Error(`Missing value for ${flag}`);
  }
  return value;
}

function parseEnvPair(value) {
  const separator = value.indexOf("=");
  if (separator <= 0) {
    throw new Error(`Invalid --env format: "${value}". Expected KEY=VALUE`);
  }
  const key = value.slice(0, separator).trim();
  const envValue = value.slice(separator + 1);
  if (!key) {
    throw new Error(`Invalid --env key in "${value}"`);
  }
  return { key, envValue };
}

function parseArgs(args) {
  const options = {
    name: null,
    test: false,
    allowNonPm2: false,
    adminOnly: false,
    cleanDb: false,
    port: null,
    questionSet: null,
    env: {},
    help: false,
  };

  const positional = [];

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    if (arg === "--help" || arg === "--options" || arg === "-h") {
      options.help = true;
      continue;
    }

    if (arg.startsWith("--name=")) {
      options.name = arg.slice("--name=".length).trim();
      continue;
    }
    if (arg.startsWith("--game=")) {
      options.name = arg.slice("--game=".length).trim();
      continue;
    }
    if (arg === "--name" || arg === "-n") {
      options.name = readValue(args, i, "--name");
      i += 1;
      continue;
    }
    if (arg === "--game" || arg === "-g") {
      options.name = readValue(args, i, "--game");
      i += 1;
      continue;
    }

    if (arg === "--test") {
      options.test = true;
      continue;
    }
    if (arg === "--live") {
      options.test = false;
      continue;
    }
    if (arg.startsWith("--mode=")) {
      const mode = arg.slice("--mode=".length).trim().toLowerCase();
      if (mode !== "live" && mode !== "test") {
        throw new Error(`Invalid mode "${mode}". Use live or test.`);
      }
      options.test = mode === "test";
      continue;
    }
    if (arg === "--mode") {
      const mode = readValue(args, i, "--mode").trim().toLowerCase();
      if (mode !== "live" && mode !== "test") {
        throw new Error(`Invalid mode "${mode}". Use live or test.`);
      }
      options.test = mode === "test";
      i += 1;
      continue;
    }

    if (arg === "--allow-non-pm2") {
      options.allowNonPm2 = true;
      continue;
    }
    if (arg === "--admin-only") {
      options.adminOnly = true;
      continue;
    }
    if (arg === "--clean-db") {
      options.cleanDb = true;
      continue;
    }
    if (arg.startsWith("--question-set=")) {
      options.questionSet = arg.slice("--question-set=".length).trim();
      continue;
    }
    if (arg === "--question-set" || arg === "--questions") {
      options.questionSet = readValue(args, i, arg).trim();
      i += 1;
      continue;
    }

    if (arg.startsWith("--port=")) {
      options.port = arg.slice("--port=".length).trim();
      continue;
    }
    if (arg === "--port") {
      options.port = readValue(args, i, "--port");
      i += 1;
      continue;
    }

    if (arg.startsWith("--env=")) {
      const envPair = parseEnvPair(arg.slice("--env=".length));
      options.env[envPair.key] = envPair.envValue;
      continue;
    }
    if (arg === "--env") {
      const envPair = parseEnvPair(readValue(args, i, "--env"));
      options.env[envPair.key] = envPair.envValue;
      i += 1;
      continue;
    }

    if (arg.startsWith("-")) {
      throw new Error(`Unknown option: ${arg}`);
    }

    positional.push(arg);
  }

  if (!options.name && positional.length > 0) {
    options.name = positional[0];
  }

  if (!options.name && !options.help) {
    throw new Error("Missing game name. Use --game=<quiz|luckywheel|default>");
  }

  if (options.name && !VALID_GAMES.has(options.name)) {
    throw new Error(
      `Invalid game name "${options.name}". Available: ${Array.from(VALID_GAMES).join(", ")}`
    );
  }

  if (options.port !== null) {
    const parsed = Number.parseInt(options.port, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      throw new Error(`Invalid port "${options.port}"`);
    }
    options.port = String(parsed);
  }

  if (options.test && !TEST_ENTRYPOINTS[options.name]) {
    throw new Error(`Test mode is not supported for "${options.name}"`);
  }
  if (options.questionSet) {
    if (options.name !== "quiz") {
      throw new Error("--question-set is supported only for quiz");
    }
    const parts = options.questionSet
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    if (parts.length === 0) {
      throw new Error('Invalid --question-set. Use "all" or comma-separated values.');
    }
    if (parts.length === 1 && parts[0].toLowerCase() !== "all") {
      throw new Error('Invalid --question-set. Use "all" or comma-separated values.');
    }
    options.questionSet = parts.join(",");
  }

  return options;
}

function buildRuntime(options) {
  const env = {
    ...process.env,
    MODE: options.name,
    TEST_MODE: options.test ? "true" : "false",
  };

  if (options.allowNonPm2) {
    env.ALLOW_NON_PM2 = "true";
  }

  if (options.adminOnly) {
    env.ADMIN_ONLY = "true";
  }

  if (options.cleanDb) {
    env[options.test ? "CLEAN_TEST_DB" : "CLEAN_LIVE_DB"] = "true";
  }

  if (options.port) {
    env[options.test ? "TEST_PORT" : "PORT"] = options.port;
  }
  if (options.questionSet) {
    env.QUESTION_SET = options.questionSet;
  }

  Object.assign(env, options.env);

  const scriptPath = options.test ? TEST_ENTRYPOINTS[options.name] : "server.js";

  return {
    env,
    scriptPath: path.resolve(__dirname, "..", scriptPath),
  };
}

function run(options) {
  const runtime = buildRuntime(options);
  const commandArgs = [runtime.scriptPath];

  console.log(
    `[game-cli] Starting ${options.name} (${options.test ? "test" : "live"}) using ${path.relative(
      path.resolve(__dirname, ".."),
      runtime.scriptPath
    )}`
  );

  const child = spawn(process.execPath, commandArgs, {
    cwd: path.resolve(__dirname, ".."),
    env: runtime.env,
    stdio: "inherit",
  });

  child.on("error", (error) => {
    console.error(`[game-cli] Failed to launch process: ${error.message}`);
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

function main() {
  try {
    const options = parseArgs(process.argv.slice(2));

    if (options.help) {
      printHelp();
      return;
    }

    run(options);
  } catch (error) {
    console.error(`[game-cli] ${error.message}`);
    console.error("[game-cli] Use --help to see valid options.");
    process.exit(1);
  }
}

main();
