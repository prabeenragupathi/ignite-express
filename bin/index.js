#!/usr/bin/env node

import prompts from "prompts";
import chalk from "chalk";
import ora from "ora";
import { createApp } from "../src/createApp.js";
import path, { dirname } from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const pkgRaw = await readFile(path.join(__dirname, '../package.json'), 'utf-8');
const pkg = JSON.parse(pkgRaw);


// --- store cleanup info
let projectPath = null;
let spinner = null;
let childProcess = null; // Optional: in case you use exec for npm install

async function cleanOnInterrupt() {
  if (spinner) spinner.fail(chalk.red("Project creation cancelled by user."));

  if (childProcess) {
    try {
      childProcess.kill(); // if using spawn/exec
    } catch (e) {
      console.warn("Couldn't kill npm process:", e.message);
    }
  }

  // Give time for system to release folder lock (especially on Windows)
  await new Promise((r) => setTimeout(r, 500));

  if (projectPath) {
    try {
      await fs.rm(projectPath, { recursive: true, force: true });
      console.log(
        chalk.yellow("\nProject creation cancelled. Cleanup complete.")
      );
    } catch (e) {
      console.error(chalk.red("⚠️ Cleanup failed:"), e);
    }
  }

  process.exit(1);
}

//! 🛑 Ctrl+C / force quit
process.on("SIGINT", cleanOnInterrupt);
process.on("SIGTERM", cleanOnInterrupt); // Linux friendly

//! ❌ Escape key or manual cancel from prompt
prompts.override({
  onCancel: async () => {
    await cleanOnInterrupt();
    return false; // Exit prompt
  },
});

//? getting arguments values
const rawArgs = process.argv.slice(2);

//? flasg we have
const flags = {
  version: rawArgs.includes("--version") || rawArgs.includes("-v"),
  help: rawArgs.includes("--help") || rawArgs.includes("-h"),
  yes: rawArgs.includes("--yes") || rawArgs.includes("-y"),
  typescript: rawArgs.includes("--typescript"),
  noEslint: rawArgs.includes("--no-eslint"),
  noGit: rawArgs.includes("--no-git"),
};

const projectName = rawArgs.find(
  (arg) => !arg.startsWith("-") && !arg.startsWith("--")
);

// ✅ Simple CLI flag handling
if (flags.version) {
  console.log(`${chalk.green("quick-express-gen")} ${chalk.redBright("v"+pkg.version)}`);
  process.exit(0);
}

if (flags.help) {
  console.log(`
    ${chalk.bold.green('Usage:')}
      ${chalk.cyan('npx quick-express-gen')} ${chalk.yellow('[project-name]')} ${chalk.magenta('[options]')}
    
    ${chalk.bold.green('Options:')}
      ${chalk.yellow('--typescript')}       ${chalk.white('Use TypeScript')}
      ${chalk.yellow('--no-eslint')}         ${chalk.white('Skip ESLint config')}
      ${chalk.yellow('--no-git')}             ${chalk.white('Don’t initialize Git')}
      ${chalk.yellow('-y, --yes')}            ${chalk.white('Accept all defaults')}
      ${chalk.yellow('-v, --version')}        ${chalk.white('Show version')}
      ${chalk.yellow('-h, --help')}           ${chalk.white('Show help')}
    `);
  process.exit(0);
}

async function main() {
  //?handling defaults
  const defaults = {
    projectName: projectName || "server",
    language: flags.typescript ? "ts" : "js",
    eslint: flags.noEslint ? false : true,
    git: flags.noGit ? false : true,
  };

  let response = {};

  //? install with defaults
  if (
    flags.yes ||
    (projectName && (flags.typescript || flags.noEslint || flags.noGit))
  ) {
    response = {};
  }
  else {
    response = await prompts([
      {
        type: projectName ? null : "text",
        name: "projectName",
        message: "Project name:",
        initial: "server",
      },
      {
        type: "select",
        name: "language",
        message: "Choose language:",
        choices: [
          { title: chalk.yellow("JavaScript 🟨"), value: "js" },
          { title: chalk.blue("TypeScript 🔵"), value: "ts" },
        ],
        initial: flags.typescript ? 1 : 0,
      },
      {
        type: "toggle",
        name: "eslint",
        message: `${chalk.magenta("Include ESLint?")} 🧹`,
        initial: !flags.noEslint,
        active: chalk.green("Yes ✅"),
        inactive: chalk.red("No ❌"),
      },
      {
        type: "toggle",
        name: "git",
        message: `${chalk.cyan("Initialize Git?")} 🛠️`,
        initial: !flags.noGit,
        active: chalk.green("Yes ✅"),
        inactive: chalk.red("No ❌"),
      },
    ],{
      onCancel: async () => {
        await cleanOnInterrupt();
        return false; // Exit prompt
      },
    });
  }

  const finalAnswers = {
    projectName: projectName || response.projectName || defaults.projectName,
    language: response.language || defaults.language,
    eslint: typeof response.eslint === "boolean" ? response.eslint : defaults.eslint,
    git: typeof response.git === "boolean" ? response.git : defaults.git,
  };

  const spinner = ora("Scaffolding your Express app...").start();

  try {
    projectPath = path.resolve(process.cwd(), finalAnswers.projectName);
    await createApp(finalAnswers);
    spinner.succeed(chalk.green("Project created successfully! 🎉"));
  } catch (e) {
    spinner.fail(chalk.red("Failed to create project."));
    console.error(e);
    await cleanOnInterrupt(); // do cleanup here too
  }
}

main();
