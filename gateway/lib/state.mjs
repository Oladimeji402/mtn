import fs from "node:fs";
import path from "node:path";

/**
 * Remembers the one job currently being dialled. If the gateway dies mid-transfer, the next
 * start finds this file and reports the job as "unknown" — it NEVER dials it again, because
 * the first attempt may already have moved the data.
 */
export function createState(dir) {
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, "in-flight.json");
  return {
    read() {
      try {
        return JSON.parse(fs.readFileSync(file, "utf8"));
      } catch {
        return null;
      }
    },
    write(job) {
      fs.writeFileSync(file, JSON.stringify({ ...job, startedAt: new Date().toISOString() }));
    },
    clear() {
      fs.rmSync(file, { force: true });
    },
    logReply(entry) {
      fs.appendFileSync(path.join(dir, "replies.log"), JSON.stringify({ at: new Date().toISOString(), ...entry }) + "\n");
    },
  };
}
