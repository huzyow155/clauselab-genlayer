const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const { createClient, chains, createAccount } = require('genlayer-js');
const fs = require('fs');

async function main() {
  const account = createAccount();
  console.log("Using deployer address:", account.address);
  const client = createClient({
    chain: chains.studionet,
    account: account,
  });

  const code = fs.readFileSync('contracts/ClauseLabCore.py', 'utf8');

  console.log("\n--- Deploying ClauseLabCore contract to Studionet ---");
  const deployTxHash = await client.deployContract({
    code: code,
    args: [],
  });
  console.log("Deploy Transaction Hash:", deployTxHash);

  const receipt = await client.waitForTransactionReceipt({
    hash: deployTxHash,
    retries: 120,
    interval: 3000,
  });
  console.log("Deploy Receipt Status:", receipt.status_name);
  console.log("Deploy Receipt Result:", receipt.result_name);
  const contractAddress = receipt.recipient;
  console.log("Deployed Core Address:", contractAddress);

  if (!contractAddress) {
    throw new Error("No contract address returned from deployment");
  }

  // 1. Create Spec
  console.log("\n--- Step 1: create_spec ---");
  const title = "Software Delivery Milestone 1";
  const clause = "The contractor shall deliver the repository with pure ASCII code and passing tests within 7 calendar days of contract creation.";
  const labelsCsv = "DELIVERED, BREACH";

  const createTxHash = await client.writeContract({
    address: contractAddress,
    functionName: 'create_spec',
    args: [title, clause, labelsCsv],
  });
  console.log("create_spec Tx Hash:", createTxHash);
  const createReceipt = await client.waitForTransactionReceipt({
    hash: createTxHash,
    retries: 120,
    interval: 3000,
  });
  console.log("create_spec Status:", createReceipt.status_name);
  console.log("create_spec Result:", createReceipt.result_name);

  // Compute expected spec_id: first 12 hex of sha256(author|title|clause)
  const crypto = require('crypto');
  const expectedSpecId = crypto.createHash('sha256')
    .update(`${account.address}|${title}|${clause}`)
    .digest('hex')
    .slice(0, 12);
  console.log("Expected Spec ID:", expectedSpecId);

  const specReadback = await client.readContract({
    address: contractAddress,
    functionName: 'get_spec',
    args: [expectedSpecId],
  });
  console.log("Spec Readback:", specReadback);

  // 2. Add Scenario
  console.log("\n--- Step 2: add_scenario ---");
  const scenarioText = "The contractor delivers the complete pure ASCII codebase with all tests passing on day 4.";
  const expectedLabel = "DELIVERED";

  const addScTxHash = await client.writeContract({
    address: contractAddress,
    functionName: 'add_scenario',
    args: [expectedSpecId, scenarioText, expectedLabel],
  });
  console.log("add_scenario Tx Hash:", addScTxHash);
  const addScReceipt = await client.waitForTransactionReceipt({
    hash: addScTxHash,
    retries: 120,
    interval: 3000,
  });
  console.log("add_scenario Status:", addScReceipt.status_name);
  console.log("add_scenario Result:", addScReceipt.result_name);

  const scReadback1 = await client.readContract({
    address: contractAddress,
    functionName: 'get_scenario',
    args: [expectedSpecId, 1],
  });
  console.log("Scenario Readback (before run):", scReadback1);

  // 3. Run Scenario live (consensus)
  console.log("\n--- Step 3: run_scenario (live validator consensus) ---");
  const startRunTime = Date.now();
  const runTxHash = await client.writeContract({
    address: contractAddress,
    functionName: 'run_scenario',
    args: [expectedSpecId, 1],
  });
  console.log("run_scenario Tx Hash:", runTxHash);

  const runReceipt = await client.waitForTransactionReceipt({
    hash: runTxHash,
    retries: 120,
    interval: 3000,
  });
  const durationSec = ((Date.now() - startRunTime) / 1000).toFixed(2);
  console.log(`run_scenario Completed in ${durationSec}s`);
  console.log("run_scenario Status:", runReceipt.status_name);
  console.log("run_scenario Result:", runReceipt.result_name);

  const scReadback2 = await client.readContract({
    address: contractAddress,
    functionName: 'get_scenario',
    args: [expectedSpecId, 1],
  });
  console.log("Scenario Readback (after run):", scReadback2);

  const parsedSc = JSON.parse(scReadback2);
  if (!parsedSc.matches || parsedSc.label !== expectedLabel) {
    throw new Error(`Scenario run did not match expected: got ${parsedSc.label}, expected ${expectedLabel}`);
  }
  console.log("\n>>> MILESTONE 1 VERIFICATION SUCCESSFUL: Scenario matched expected label! <<<");

  const coreOutput = {
    network: "studionet",
    chainId: 61999,
    deployer: account.address,
    contractAddress,
    deployTxHash,
    specId: expectedSpecId,
    createTxHash,
    addScenarioTxHash: addScTxHash,
    runScenarioTxHash: runTxHash,
    runScenarioLatencySec: durationSec,
    spec: JSON.parse(specReadback),
    scenarioResult: parsedSc,
  };
  fs.writeFileSync('scripts/deploy/core_output.json', JSON.stringify(coreOutput, null, 2));
  console.log("Saved core output to scripts/deploy/core_output.json");
}

main().catch(err => {
  console.error("Core deployment error:", err);
  process.exit(1);
});
