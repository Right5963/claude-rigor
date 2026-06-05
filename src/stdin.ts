/** Read all of stdin as a string, with a safety timeout. I/O boundary. */
export function readStdin(timeoutMs = 5000): Promise<string> {
  return new Promise((resolve) => {
    let buf = "";
    process.stdin.on("data", (chunk) => (buf += chunk));
    process.stdin.on("end", () => resolve(buf));
    setTimeout(() => resolve(buf), timeoutMs);
  });
}
