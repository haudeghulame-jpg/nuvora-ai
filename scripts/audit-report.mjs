// Prints a readable summary of `npm audit --json` output for the CI log.
// It is informational only: it never fails the build, never runs
// `npm audit fix`, and never changes any dependency.
import { execFileSync } from "node:child_process";
import { appendFileSync, readFileSync } from "node:fs";

const file = process.argv[2] ?? "audit.json";

let report;
try {
  report = JSON.parse(readFileSync(file, "utf8"));
} catch (error) {
  console.log(`Could not read ${file}: ${error instanceof Error ? error.message : error}`);
  process.exit(0);
}

const severityOrder = { critical: 0, high: 1, moderate: 2, low: 3, info: 4 };
const vulnerabilities = Object.values(report.vulnerabilities ?? {}).sort(
  (a, b) =>
    (severityOrder[a.severity] ?? 9) - (severityOrder[b.severity] ?? 9) ||
    a.name.localeCompare(b.name),
);

const lines = [];
lines.push(`Totals by severity: ${JSON.stringify(report.metadata?.vulnerabilities ?? {})}`);

function dependencyPaths(name) {
  if (!/^[@a-z0-9][\w@/.~-]*$/i.test(name)) return "  (package name skipped)";
  try {
    return execFileSync("npm", ["ls", name, "--all"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    // `npm ls` exits non-zero in some situations but still prints the tree.
    return (error.stdout ?? "").toString() || "  (no dependency tree available)";
  }
}

for (const vuln of vulnerabilities) {
  const kind = vuln.isDirect ? "direct dependency" : "indirect dependency";
  lines.push("", `${String(vuln.severity).toUpperCase()}  ${vuln.name}  (${kind}; affected range ${vuln.range})`);

  for (const via of vuln.via ?? []) {
    if (typeof via === "string") {
      lines.push(`  caused through package: ${via}`);
    } else {
      lines.push(`  advisory: ${via.title} [${via.severity}] ${via.url} (affects ${via.range})`);
    }
  }

  lines.push(`  installed at: ${(vuln.nodes ?? []).join(", ") || "not listed"}`);
  if (vuln.effects?.length) lines.push(`  also affects: ${vuln.effects.join(", ")}`);

  const fix = vuln.fixAvailable;
  if (fix === true) {
    lines.push("  fix: available without a breaking change (NOT applied)");
  } else if (fix && typeof fix === "object") {
    const major = fix.isSemVerMajor ? " (breaking: major version change)" : "";
    lines.push(`  fix: update ${fix.name} to ${fix.version}${major} (NOT applied)`);
  } else {
    lines.push("  fix: none available yet");
  }

  lines.push("  dependency path(s) from this project:");
  lines.push(
    dependencyPaths(vuln.name)
      .trimEnd()
      .split("\n")
      .map((line) => `    ${line}`)
      .join("\n"),
  );
}

const output = lines.join("\n");
console.log(output);

if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(
    process.env.GITHUB_STEP_SUMMARY,
    `## npm audit report (informational)\n\n\`\`\`text\n${output}\n\`\`\`\n`,
  );
}
