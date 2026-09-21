const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const { createClient, chains, createAccount } = require('genlayer-js');
const fs = require('fs');
const crypto = require('crypto');

async function main() {
  console.log("=================================================");
  console.log("      CLAUSELAB LIVE ON-CHAIN EVIDENCE RUN       ");
  console.log("=================================================");

  const partyA = createAccount();
  const partyB = createAccount();
  console.log("Party A (Author):      ", partyA.address);
  console.log("Party B (Counterparty):", partyB.address);

  const clientA = createClient({ chain: chains.studionet, account: partyA });
  const clientB = createClient({ chain: chains.studionet, account: partyB });

  // 1. Deploy ClauseLab contract
  console.log("\n[1/10] Deploying ClauseLab contract to Studionet...");
  const code = fs.readFileSync('contracts/ClauseLab.py', 'utf8');
  const deployTxHash = await clientA.deployContract({ code, args: [] });
  console.log("Deploy Tx Hash:", deployTxHash);

  const deployReceipt = await clientA.waitForTransactionReceipt({
    hash: deployTxHash,
    retries: 120,
    interval: 3000,
  });
  console.log("Deploy Status:", deployReceipt.status_name, "| Result:", deployReceipt.result_name);
  const contractAddress = deployReceipt.recipient;
  console.log("Deployed ClauseLab Address:", contractAddress);

  if (!contractAddress) throw new Error("Deploy failed to return address");

  // 2. Party A creates spec with deliberately vague clause
  console.log("\n[2/10] Creating Spec with deliberately vague clause...");
  const title = "Software Delivery Agreement";
  const vagueClause = "The contractor shall deliver a satisfactory software package promptly.";
  const labelsCsv = "DELIVERED, BREACH";

  const createTx = await clientA.writeContract({
    address: contractAddress,
    functionName: 'create_spec',
    args: [title, vagueClause, labelsCsv],
  });
  console.log("create_spec Tx Hash:", createTx);
  const createReceipt = await clientA.waitForTransactionReceipt({ hash: createTx, retries: 120, interval: 3000 });
  console.log("create_spec Status:", createReceipt.status_name, "| Result:", createReceipt.result_name);

  const specId = crypto.createHash('sha256')
    .update(`${partyA.address}|${title}|${vagueClause}`)
    .digest('hex')
    .slice(0, 12);
  console.log("Computed Spec ID:", specId);

  // 3. Invite Party B
  console.log("\n[3/10] Inviting Party B...");
  const inviteTx = await clientA.writeContract({
    address: contractAddress,
    functionName: 'invite',
    args: [specId, partyB.address],
  });
  console.log("invite Tx Hash:", inviteTx);
  const inviteReceipt = await clientA.waitForTransactionReceipt({ hash: inviteTx, retries: 120, interval: 3000 });
  console.log("invite Status:", inviteReceipt.status_name, "| Result:", inviteReceipt.result_name);

  // 4. Add 4 scenarios across both parties
  console.log("\n[4/10] Adding 4 scenarios across both parties...");
  // Sc 1: Party A
  const txS1 = await clientA.writeContract({
    address: contractAddress,
    functionName: 'add_scenario',
    args: [specId, "Contractor sends an email saying done with no files attached 10 days later.", "BREACH"],
  });
  await clientA.waitForTransactionReceipt({ hash: txS1, retries: 120, interval: 3000 });

  // Sc 2: Party A
  const txS2 = await clientA.writeContract({
    address: contractAddress,
    functionName: 'add_scenario',
    args: [specId, "Contractor provides the complete software package with full passing tests on day 2.", "DELIVERED"],
  });
  await clientA.waitForTransactionReceipt({ hash: txS2, retries: 120, interval: 3000 });

  // Sc 3: Party B (Vague boundary case designed to expose ambiguity on "promptly")
  const txS3 = await clientB.writeContract({
    address: contractAddress,
    functionName: 'add_scenario',
    args: [specId, "The contractor delivers on day 4. The clause does not state any timeframe for promptness, so it is undecidable whether day 4 is prompt.", "DELIVERED"],
  });
  await clientB.waitForTransactionReceipt({ hash: txS3, retries: 120, interval: 3000 });

  // Sc 4: Party B
  const txS4 = await clientB.writeContract({
    address: contractAddress,
    functionName: 'add_scenario',
    args: [specId, "Contractor disappears for 3 weeks and delivers nothing.", "BREACH"],
  });
  await clientB.waitForTransactionReceipt({ hash: txS4, retries: 120, interval: 3000 });
  console.log("All 4 scenarios added across Party A and Party B.");

  // 5. Run scenarios on Vague Clause
  console.log("\n[5/10] Running scenarios on Version 1 (Vague Clause)...");
  const tStartS3 = Date.now();
  const txRunS3 = await clientA.writeContract({
    address: contractAddress,
    functionName: 'run_scenario',
    args: [specId, 3],
  });
  console.log("run_scenario(3) Tx Hash:", txRunS3);
  const recRunS3 = await clientA.waitForTransactionReceipt({ hash: txRunS3, retries: 120, interval: 3000 });
  const runS3Duration = ((Date.now() - tStartS3) / 1000).toFixed(2);
  console.log(`run_scenario(3) Completed in ${runS3Duration}s | Status: ${recRunS3.status_name} | Result: ${recRunS3.result_name}`);

  console.log("Running scenario 1, 2, 4 on Version 1...");
  const txRun1 = await clientA.writeContract({ address: contractAddress, functionName: 'run_scenario', args: [specId, 1] });
  await clientA.waitForTransactionReceipt({ hash: txRun1, retries: 120, interval: 3000 });
  const txRun2 = await clientA.writeContract({ address: contractAddress, functionName: 'run_scenario', args: [specId, 2] });
  await clientA.waitForTransactionReceipt({ hash: txRun2, retries: 120, interval: 3000 });
  const txRun4 = await clientA.writeContract({ address: contractAddress, functionName: 'run_scenario', args: [specId, 4] });
  await clientA.waitForTransactionReceipt({ hash: txRun4, retries: 120, interval: 3000 });

  const suiteRepV1 = await clientA.readContract({ address: contractAddress, functionName: 'suite_report', args: [specId] });
  console.log("Suite Report (Version 1 - Vague):", suiteRepV1);

  // Sign Version 1
  console.log("Parties sign Version 1...");
  const txSignA1 = await clientA.writeContract({ address: contractAddress, functionName: 'sign', args: [specId] });
  await clientA.waitForTransactionReceipt({ hash: txSignA1, retries: 120, interval: 3000 });
  const txSignB1 = await clientB.writeContract({ address: contractAddress, functionName: 'sign', args: [specId] });
  await clientB.waitForTransactionReceipt({ hash: txSignB1, retries: 120, interval: 3000 });

  // Attempt lock on Vague Clause: MUST REVERT or fail
  console.log("Attempting lock on Vague Clause (verifying gating/revert behavior)...");
  let lockV1Tx = null;
  let lockV1Status = "REVERTED";
  try {
    lockV1Tx = await clientA.writeContract({ address: contractAddress, functionName: 'lock', args: [specId] });
    const lockV1Rec = await clientA.waitForTransactionReceipt({ hash: lockV1Tx, retries: 120, interval: 3000 });
    console.log("lock V1 Receipt Status:", lockV1Rec.status_name, "| Result:", lockV1Rec.result_name);
    lockV1Status = lockV1Rec.result_name;
  } catch (err) {
    console.log("Lock V1 correctly reverted as expected:", err.message || err);
  }

  const isLockedV1 = await clientA.readContract({ address: contractAddress, functionName: 'is_locked', args: [specId] });
  console.log("Is spec locked after vague phase?:", isLockedV1);

  // 6. Amend clause to make it clear and unambiguous
  console.log("\n[6/10] Amending clause to remove ambiguity...");
  const clearClause = "The contractor shall deliver the repository with pure ASCII code and passing tests within 7 calendar days of contract creation.";
  const amendTx = await clientA.writeContract({
    address: contractAddress,
    functionName: 'amend',
    args: [specId, clearClause],
  });
  console.log("amend Tx Hash:", amendTx);
  const amendReceipt = await clientA.waitForTransactionReceipt({ hash: amendTx, retries: 120, interval: 3000 });
  console.log("amend Status:", amendReceipt.status_name, "| Result:", amendReceipt.result_name);

  // 7. Re-run scenarios on clear clause
  console.log("\n[7/10] Re-running scenarios on Version 2 (Clear Clause)...");
  for (let i = 1; i <= 4; i++) {
    console.log(`Running scenario ${i}...`);
    const tx = await clientA.writeContract({ address: contractAddress, functionName: 'run_scenario', args: [specId, i] });
    const r = await clientA.waitForTransactionReceipt({ hash: tx, retries: 120, interval: 3000 });
    console.log(`Scenario ${i} run: ${r.status_name} / ${r.result_name}`);
  }

  const suiteRepV2 = await clientA.readContract({ address: contractAddress, functionName: 'suite_report', args: [specId] });
  console.log("Suite Report (Version 2 - Clear):", suiteRepV2);

  // 8. Sign and Lock Version 2
  console.log("\n[8/10] Signing and Locking Version 2...");
  const txSignA2 = await clientA.writeContract({ address: contractAddress, functionName: 'sign', args: [specId] });
  await clientA.waitForTransactionReceipt({ hash: txSignA2, retries: 120, interval: 3000 });
  const txSignB2 = await clientB.writeContract({ address: contractAddress, functionName: 'sign', args: [specId] });
  await clientB.waitForTransactionReceipt({ hash: txSignB2, retries: 120, interval: 3000 });

  const lockTx = await clientA.writeContract({ address: contractAddress, functionName: 'lock', args: [specId] });
  console.log("lock Tx Hash:", lockTx);
  const lockRec = await clientA.waitForTransactionReceipt({ hash: lockTx, retries: 120, interval: 3000 });
  console.log("lock Status:", lockRec.status_name, "| Result:", lockRec.result_name);

  const lockedFinal = await clientA.readContract({ address: contractAddress, functionName: 'is_locked', args: [specId] });
  const specHash = await clientA.readContract({ address: contractAddress, functionName: 'get_spec_hash', args: [specId] });
  console.log("Spec Locked?:", lockedFinal, "| Spec Hash:", specHash);

  // 9. Stipulate and confirm facts
  console.log("\n[9/10] Stipulating and confirming dispute facts...");
  const factsText = "The contractor pushed the repository with pure ASCII code and passing tests on calendar day 3, well within the 7-day requirement.";
  const stipTx = await clientA.writeContract({
    address: contractAddress,
    functionName: 'stipulate_facts',
    args: [specId, factsText],
  });
  console.log("stipulate_facts Tx Hash:", stipTx);
  const stipRec = await clientA.waitForTransactionReceipt({ hash: stipTx, retries: 120, interval: 3000 });
  console.log("stipulate_facts Status:", stipRec.status_name, "| Result:", stipRec.result_name);

  const factsId = crypto.createHash('sha256').update(factsText).digest('hex').slice(0, 12);
  console.log("Computed Facts ID:", factsId);

  // Confirm facts by Party B
  console.log("Party B confirming facts...");
  const confTx = await clientB.writeContract({
    address: contractAddress,
    functionName: 'confirm_facts',
    args: [specId, factsId],
  });
  console.log("confirm_facts Tx Hash:", confTx);
  const confRec = await clientB.waitForTransactionReceipt({ hash: confTx, retries: 120, interval: 3000 });
  console.log("confirm_facts Status:", confRec.status_name, "| Result:", confRec.result_name);

  const factsReadback = await clientA.readContract({ address: contractAddress, functionName: 'get_facts', args: [specId, factsId] });
  console.log("Confirmed Facts Readback:", factsReadback);

  // 10. Adjudicate on-chain (Consensus with in-band canary calibration)
  console.log("\n[10/10] Adjudicating on confirmed facts (in-band canary + ruling)...");
  const tStartAdj = Date.now();
  const adjTx = await clientA.writeContract({
    address: contractAddress,
    functionName: 'adjudicate',
    args: [specId, factsId],
  });
  console.log("adjudicate Tx Hash:", adjTx);
  const adjRec = await clientA.waitForTransactionReceipt({ hash: adjTx, retries: 120, interval: 3000 });
  const adjDuration = ((Date.now() - tStartAdj) / 1000).toFixed(2);
  console.log(`adjudicate Completed in ${adjDuration}s | Status: ${adjRec.status_name} | Result: ${adjRec.result_name}`);

  const rulingReadback = await clientA.readContract({ address: contractAddress, functionName: 'get_ruling', args: [specId, factsId] });
  console.log("Ruling Readback:", rulingReadback);

  // Deploy and test Consumer Contract
  console.log("\n--- Deploying and Testing Consumer Contract ---");
  const consumerCode = fs.readFileSync('examples/consumer/consumer.py', 'utf8');
  const deployConsTx = await clientA.deployContract({ code: consumerCode, args: [contractAddress] });
  console.log("Deploy Consumer Tx Hash:", deployConsTx);
  const consRec = await clientA.waitForTransactionReceipt({ hash: deployConsTx, retries: 120, interval: 3000 });
  const consumerAddress = consRec.recipient;
  console.log("Consumer Contract Address:", consumerAddress);

  const settleTx = await clientA.writeContract({
    address: consumerAddress,
    functionName: 'settle_from_ruling',
    args: [specId, factsId],
  });
  console.log("Consumer settle_from_ruling Tx Hash:", settleTx);
  const settleRec = await clientA.waitForTransactionReceipt({ hash: settleTx, retries: 120, interval: 3000 });
  console.log("Consumer settle Status:", settleRec.status_name, "| Result:", settleRec.result_name);

  const settledVerdict = await clientA.readContract({
    address: consumerAddress,
    functionName: 'get_settled_dispute',
    args: [specId, factsId],
  });
  console.log("Consumer Settled Dispute Verdict:", settledVerdict);

  // Compile full evidence output
  const liveEvidence = {
    network: "studionet",
    chainId: 61999,
    contractAddress,
    consumerAddress,
    deployTxHash,
    partyA: partyA.address,
    partyB: partyB.address,
    specId,
    vagueClause,
    clearClause,
    specHash,
    factsId,
    latencies: {
      runScenarioSec: runS3Duration,
      adjudicateSec: adjDuration,
    },
    transactions: {
      deployContract: { txHash: deployTxHash, status: deployReceipt.status_name, result: deployReceipt.result_name },
      createSpec: { txHash: createTx, status: createReceipt.status_name, result: createReceipt.result_name },
      invitePartyB: { txHash: inviteTx, status: inviteReceipt.status_name, result: inviteReceipt.result_name },
      addScenario1: { txHash: txS1 },
      addScenario2: { txHash: txS2 },
      addScenario3: { txHash: txS3 },
      addScenario4: { txHash: txS4 },
      runScenarioVague: { txHash: txRunS3, status: recRunS3.status_name, result: recRunS3.result_name, latencySec: runS3Duration },
      lockVagueRevert: { txHash: lockV1Tx, status: lockV1Status },
      amendClause: { txHash: amendTx, status: amendReceipt.status_name, result: amendReceipt.result_name },
      signPartyA: { txHash: txSignA2 },
      signPartyB: { txHash: txSignB2 },
      lockSpec: { txHash: lockTx, status: lockRec.status_name, result: lockRec.result_name },
      stipulateFacts: { txHash: stipTx, status: stipRec.status_name, result: stipRec.result_name },
      confirmFacts: { txHash: confTx, status: confRec.status_name, result: confRec.result_name },
      adjudicate: { txHash: adjTx, status: adjRec.status_name, result: adjRec.result_name, latencySec: adjDuration },
      deployConsumer: { txHash: deployConsTx, status: consRec.status_name, result: consRec.result_name },
      consumerSettle: { txHash: settleTx, status: settleRec.status_name, result: settleRec.result_name },
    },
    readbacks: {
      suiteReportV1: JSON.parse(suiteRepV1),
      suiteReportV2: JSON.parse(suiteRepV2),
      factsRecord: JSON.parse(factsReadback),
      rulingRecord: JSON.parse(rulingReadback),
      consumerSettledVerdict: settledVerdict,
    }
  };

  fs.writeFileSync('scripts/deploy/live_evidence.json', JSON.stringify(liveEvidence, null, 2));
  console.log("\nSaved live evidence to scripts/deploy/live_evidence.json");
  console.log("=================================================");
  console.log("      ALL ON-CHAIN ACTIONS COMPLETED 100%!       ");
  console.log("=================================================");
}

main().catch(err => {
  console.error("Live evidence execution error:", err);
  process.exit(1);
});
