import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
import ora from "ora";
import chalk from "chalk";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function createApp({ projectName, language, eslint, git }) {
  const spinner = ora("Creating your project...").start();

  const isTS = language === "ts";
  const projectPath = path.resolve(process.cwd(), projectName);
  const templateDir = path.resolve(
    __dirname,
    `../templates/${isTS ? "ts" : "js"}`
  );
  const rootDir = path.resolve(
    import.meta.url.replace("file:///", ""),
    "../../"
  ); // root of the CLI repo
  const gitignoreSrc = path.join(rootDir, ".gitignore");

  try {
    // ✅ Check if folder already exists
    try {
      await fs.stat(projectPath); // Check if the directory exists
      console.error(
        chalk.red(`\n ❌ A folder named "${projectName}" already exists.`)
      );
      process.exit(1);
    } catch {
      // Folder does not exist — proceed
    }

    // Create project folder
    await fs.mkdir(projectPath, { recursive: true });

    //? creating dirs
    await createFolders(projectPath);

    // Copy index file
    const indexFile = `index.${isTS ? "ts" : "js"}`;
    const srcContent = await fs.readFile(
      path.join(templateDir, indexFile),
      "utf-8"
    );
    await fs.writeFile(path.join(projectPath, indexFile), srcContent);

    // Create .env
    await fs.writeFile(path.join(projectPath, ".env"), "PORT=3000\n");

    // Create package.json
    const packageJson = {
      name: projectName,
      version: "1.0.0",
      type: "module",
      main: indexFile,
      scripts: {
        start: isTS ? "ts-node index.ts" : "node index.js",
        dev: isTS ? "nodemon --exec ts-node index.ts" : "nodemon index.js",
      },
      dependencies: {},
      devDependencies: {},
    };

    await fs.writeFile(
      path.join(projectPath, "package.json"),
      JSON.stringify(packageJson, null, 2)
    );

    // Change to project directory
    process.chdir(projectPath);

    // Install dependencies
    spinner.text = "Installing dependencies...";
    const deps = ["express", "cors", "dotenv"];
    const devDeps = isTS
      ? ["typescript", "ts-node", "@types/node", "@types/express", "nodemon"]
      : ["nodemon"];

    execSync(`npm install ${deps.join(" ")}`, { stdio: "inherit" });
    spinner.text = "Installing Dev dependencies...";
    execSync(`npm install -D ${devDeps.join(" ")}`, { stdio: "inherit" });

    if (isTS) {
      spinner.text = "Installing TypeScript tools...";
      execSync(`npm install -D ${devDeps.join(" ")}`, { stdio: "inherit" });

      // Create tsconfig.json
      await fs.writeFile(
        path.join(projectPath, "tsconfig.json"),
        JSON.stringify(
          {
            compilerOptions: {
              target: "esnext",
              module: "esnext",
              moduleResolution: "node",
              strict: true,
              esModuleInterop: true,
              forceConsistentCasingInFileNames: true,
              skipLibCheck: true,
            },
          },
          null,
          2
        )
      );
    }

    if (eslint) {
      spinner.text = "Installing ESLint...";
      execSync(`npm install -D eslint`, { stdio: "inherit" });
      execSync(`npx eslint --init`, { stdio: "inherit" });
    }

    if (git) {
      spinner.text = "Initializing Git...";
      execSync(`git init`, { stdio: "inherit" });
      
      //? create .gitignore file
      await fs.copyFile(gitignoreSrc, path.join(projectPath, ".gitignore"));
    }

    spinner.succeed();

    console.log(chalk.cyan(`\nNext steps:`));
    console.log(chalk.cyan(`  cd ${projectName}`));
    console.log(chalk.cyan(`  npm start or npm run dev`));
  } catch (err) {
    spinner.fail("Failed to create project.");
    try {
      await fs.rm(projectPath, { recursive: true, force: true });
      console.log("🧹 Cleaned up created files.");
    } catch (cleanupErr) {
      console.error("⚠️ Cleanup failed:", cleanupErr);
    }
    throw err;
  }
}


async function createFolders(projectPath) {
  const folders = ["routes", "controllers", "models", "middlewares", "config"];

  for (const folder of folders) {
    const dirPath = path.join(projectPath, folder);
    await fs.mkdir(dirPath, { recursive: true });
  }
}