const { exec } = require("child_process");
const util = require("util");
const dayjs = require("dayjs");
const fs = require("fs");
const path = require("path");

const execAsync = util.promisify(exec);
const writeFileAsync = util.promisify(fs.writeFile);

async function main() {
  const params = await getInputParams();

  const originalWorkDir = process.cwd();
  process.chdir(params.workDir);
  console.log("Switched to working directory: " + process.cwd());
  console.log("Loading feature branch list...");

  const branches = (
    await Promise.all(
      (await getFeatureBranches()).map((branch) => getBranchInfo(branch))
    )
  )
    .filter(isBranchOlderThanMonth)
    .sort((branchA, branchB) => branchA.date - branchB.date);

  console.log(`Total number of branches: ${branches.length}`);

  await generateHtml(path.join(originalWorkDir, "branches.html"), branches);

  generateDeleteCommands(branches);
}

async function getInputParams() {
  const params = {
    workDir: process.argv[2],
  };

  return params;
}

async function getFeatureBranches() {
  const gitBranch = (await execAsync("git branch -r")).stdout;
  const branches = gitBranch
    .split("\n")
    .map((branch) => branch.trim())
    .filter((branch) => branch.startsWith("origin/feature/"));

  return branches;
}

async function getBranchInfo(branch) {
  let gitShow = (
    await execAsync(`git show ${branch} --format="%ai|%ar|%an|%h|" --no-patch`)
  ).stdout;

  const jiraKeyRegExp = /origin\/feature\/.*((necs|NECS)-[0-9]+).*/;
  const jiraKeyMatch = branch.match(jiraKeyRegExp);
  const jiraKey =
    jiraKeyMatch !== null && jiraKeyMatch.length === 3
      ? jiraKeyMatch[1].toUpperCase()
      : null;

  let [time, ago, author, hash] = gitShow.trim().split("|");
  const date = dayjs(time.substring(0, 10));
  return {
    name: branch,
    author,
    date,
    ago,
    hash,
    jiraKey,
  };
}

function isBranchOlderThanMonth(branch) {
  const monthAgo = dayjs().add(-1, "month");
  return branch.date.isBefore(monthAgo);
}

async function generateHtml(file, branches) {
  const rows = branches
    .map(
      (branch) =>
        `<tr><td>${branch.name}</td><td>${
          branch.jiraKey !== null
            ? `<a href="https://jira.unicorn.com/browse/${branch.jiraKey}">${branch.jiraKey}</a>`
            : ""
        }</td><td>${branch.date.format("YYYY-MM-DD")}</td><td>${
          branch.author
        }</td></tr>
    `
    )
    .join("");
  const table = `<table style="width: 70vw; margin: auto"><tbody>${rows}</tbody></table>`;
  const html = `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <title>GUI feature branches to delete</title>
        <meta name="description" content="GUI feature branches to delete">
        <link href="https://fonts.googleapis.com/css?family=Raleway:400,300,600" rel="stylesheet" type="text/css">
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/normalize/4.1.1/normalize.min.css">
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/skeleton/2.0.4/skeleton.min.css">
      </head>
    
    <body>
        ${table}
    </body>
    </html>`;

  await writeFileAsync(file, html);
  console.log("HTML written to " + file);
}

function generateDeleteCommands(branches) {
  branches.forEach((branch) =>
    console.log(`git push origin --delete ${branch.name}`)
  );
}

main().catch((error) => console.log(error));
