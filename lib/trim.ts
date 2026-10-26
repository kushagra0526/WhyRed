const ANSI = /\x1b\[[0-9;]*m/g;
const TIMESTAMP = /^\d{4}-\d{2}-\d{2}T[\d:.]+Z /gm;
const NOISE =
  /^(npm (warn|notice)|added \d+ packages|Downloading|Download|Extracting|Unpacking|Resolving|Fetching)/i;

export function trimLog(raw: string): string {
  const lines = raw.replace(ANSI, "").replace(TIMESTAMP, "").split(/\r?\n/);

  const errorAt = lines.findIndex((line) => line.includes("##[error]"));
  let block: string[];

  if (errorAt === -1) {
    block = lines.slice(-60);
  } else {
    let start = errorAt;
    for (let i = errorAt; i >= 0; i--) {
      if (lines[i].includes("##[group]Run ")) {
        start = i;
        break;
      }
    }
    block = lines.slice(start, errorAt + 6);
    if (block.length > 80) block = [...block.slice(0, 10), ...block.slice(-40)];
  }

  return block
    .filter((line) => !NOISE.test(line))
    .map((line, i) => `${i + 1}| ${line}`)
    .join("\n");
}
