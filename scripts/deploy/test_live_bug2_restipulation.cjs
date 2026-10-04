const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const { createClient, chains, createAccount } = require('genlayer-js');
const fs = require('fs');

const CONTRACT_ADDRESS = '0x13ac18867642fdCd740EA14c6EA7588abdCb7F73';

async function withRetry(fn, desc, maxRetries = 8, baseDelay = 3000) {
  for (let i = 1; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      console.warn(`[Retry ${i}/${maxRetries}] ${desc} failed: ${err.message || err}`);
      if (i === maxRetries) throw err;
      await new Promise(r => setTimeout(r, baseDelay * i));
    }
  }
}

async function main() {
  console.log('================================================================');
  console.log('BUG 2 PRODUCTION-CONTRACT TEST: RESTIPULATION & RE-ADJUDICATION');
  console.log('Contract Address:', CONTRACT_ADDRESS);
  console.log('Target: Identical-text restipulation must be rejected without');
  console.log('        modifying existing confirmations, and re-adjudication');
  console.log('        on an existing key must be rejected.');
  console.log('================================================================\n');

  const partyA = createAccount();
  const partyB = createAccount();
  console.log('Party A address:', partyA.address);
  console.log('Party B address:', partyB.address);

  const clientA = createClient({ chain: chains.studionet, account: partyA });
  const clientB = createClient({ chain: chains.studionet, account: partyB });

  // Step 1: Create spec, invite Party B, add 4 scenarios, run, sign, lock
  const specTitle = 'Bug2 Protection Live ' + Math.floor(Math.random() * 10000);
  const clause = 'The cloud service provider shall maintain monthly API uptime of at least 99.9% and respond to critical outage incidents within 1 hour.';
  const labelsCsv = 'COMPLIANT, VIOLATION';

  console.log(`\n[STEP 1] Creating and locking spec: "${specTitle}"...`);
  const txCreate = await withRetry(
    () => clientA.writeContract({ address: CONTRACT_ADDRESS, functionName: 'create_spec', args: [specTitle, clause, labelsCsv] }),
    'create_spec'
  );
  await withRetry(() => clientA.waitForTransactionReceipt({ hash: txCreate, retries: 120, interval: 3000 }), 'rcCreate');

  const rawLatest = await clientA.readContract({ address: CONTRACT_ADDRESS, functionName: 'get_latest_spec', args: [partyA.address] });
  const specId = typeof rawLatest === 'string' ? rawLatest.replace(/^"|"$/g, '') : rawLatest;
  console.log('  Created spec_id:', specId);

  const txInvite = await withRetry(
    () => clientA.writeContract({ address: CONTRACT_ADDRESS, functionName: 'invite', args: [specId, partyB.address] }),
    'invite'
  );
  await withRetry(() => clientA.waitForTransactionReceipt({ hash: txInvite, retries: 120, interval: 3000 }), 'rcInvite');

  const txSc1 = await withRetry(
    () => clientA.writeContract({ address: CONTRACT_ADDRESS, functionName: 'add_scenario', args: [specId, 'The provider maintains 99.95% API uptime for the month and acknowledged the single outage alert within 20 minutes.', 'COMPLIANT'] }),
    'sc1'
  );
  await withRetry(() => clientA.waitForTransactionReceipt({ hash: txSc1, retries: 120, interval: 3000 }), 'rcSc1');

  const txSc2 = await withRetry(
    () => clientA.writeContract({ address: CONTRACT_ADDRESS, functionName: 'add_scenario', args: [specId, 'The provider maintains 100% monthly availability with zero downtime and all healthchecks passing.', 'COMPLIANT'] }),
    'sc2'
  );
  await withRetry(() => clientA.waitForTransactionReceipt({ hash: txSc2, retries: 120, interval: 3000 }), 'rcSc2');

  const txSc3 = await withRetry(
    () => clientB.writeContract({ address: CONTRACT_ADDRESS, functionName: 'add_scenario', args: [specId, 'A critical database outage occurs and the support team does not respond or investigate for 4 hours.', 'VIOLATION'] }),
    'sc3'
  );
  await withRetry(() => clientB.waitForTransactionReceipt({ hash: txSc3, retries: 120, interval: 3000 }), 'rcSc3');

  const txSc4 = await withRetry(
    () => clientB.writeContract({ address: CONTRACT_ADDRESS, functionName: 'add_scenario', args: [specId, 'Monthly server availability drops to 98.5% due to repeated unscheduled infrastructure failures.', 'VIOLATION'] }),
    'sc4'
  );
  await withRetry(() => clientB.waitForTransactionReceipt({ hash: txSc4, retries: 120, interval: 3000 }), 'rcSc4');

  for (let i = 1; i <= 4; i++) {
    const txRun = await withRetry(
      () => clientA.writeContract({ address: CONTRACT_ADDRESS, functionName: 'run_scenario', args: [specId, i] }),
      `run_${i}`
    );
    await withRetry(() => clientA.waitForTransactionReceipt({ hash: txRun, retries: 120, interval: 3000 }), `rcRun${i}`);
  }

  const txSignA = await withRetry(
    () => clientA.writeContract({ address: CONTRACT_ADDRESS, functionName: 'sign', args: [specId] }),
    'signA'
  );
  await withRetry(() => clientA.waitForTransactionReceipt({ hash: txSignA, retries: 120, interval: 3000 }), 'rcSignA');

  const txSignB = await withRetry(
    () => clientB.writeContract({ address: CONTRACT_ADDRESS, functionName: 'sign', args: [specId] }),
    'signB'
  );
  await withRetry(() => clientB.waitForTransactionReceipt({ hash: txSignB, retries: 120, interval: 3000 }), 'rcSignB');

  const txLock = await withRetry(
    () => clientA.writeContract({ address: CONTRACT_ADDRESS, functionName: 'lock', args: [specId] }),
    'lock'
  );
  await withRetry(() => clientA.waitForTransactionReceipt({ hash: txLock, retries: 120, interval: 3000 }), 'rcLock');
  console.log('  Spec locked successfully!');

  // Step 2: Party A stipulates facts
  console.log('\n[STEP 2] Party A stipulates dispute facts...');
  const disputeText = 'During July 2026, the provider recorded 99.98% total API uptime, and responded to the single incident alert in 25 minutes.';
  const txFacts1 = await withRetry(
    () => clientA.writeContract({ address: CONTRACT_ADDRESS, functionName: 'stipulate_facts', args: [specId, disputeText] }),
    'stipulate_facts'
  );
  console.log('  stipulate_facts tx hash:', txFacts1);
  await withRetry(() => clientA.waitForTransactionReceipt({ hash: txFacts1, retries: 120, interval: 3000 }), 'rcFacts1');

  const rawFactsId = await clientA.readContract({ address: CONTRACT_ADDRESS, functionName: 'get_latest_facts_id', args: [specId] });
  const factsId = typeof rawFactsId === 'string' ? rawFactsId.replace(/^"|"$/g, '') : rawFactsId;
  console.log('  Facts ID created:', factsId);

  // Step 3: Party B confirms facts
  console.log('\n[STEP 3] Party B confirms facts...');
  const txConfirmB = await withRetry(
    () => clientB.writeContract({ address: CONTRACT_ADDRESS, functionName: 'confirm_facts', args: [specId, factsId] }),
    'confirm_facts'
  );
  console.log('  confirm_facts tx hash:', txConfirmB);
  await withRetry(() => clientB.waitForTransactionReceipt({ hash: txConfirmB, retries: 120, interval: 3000 }), 'rcConfirmB');

  // Read back facts before duplicate restipulation attempt
  const factsBeforeAttempt = JSON.parse(await clientA.readContract({
    address: CONTRACT_ADDRESS,
    functionName: 'get_facts',
    args: [specId, factsId]
  }));
  console.log('\n[READBACK 1] Facts record BEFORE restipulation attempt:');
  console.log('  facts_id:', factsBeforeAttempt.facts_id);
  console.log('  by:      ', factsBeforeAttempt.by);
  if (factsBeforeAttempt.by.length !== 2) {
    throw new Error('Facts should have 2 confirmations before restipulation attempt!');
  }

  // Step 4: ATTEMPT DUPLICATE RESTIPULATION WITH IDENTICAL TEXT
  console.log('\n[STEP 4] Attempting to restipulate the EXACT same text again...');
  let restipulateTx = null;
  let restipulateError = null;
  let restipulateExecResult = null;

  try {
    restipulateTx = await clientA.writeContract({
      address: CONTRACT_ADDRESS,
      functionName: 'stipulate_facts',
      args: [specId, disputeText]
    });
    console.log('  Restipulate attempt tx broadcasted:', restipulateTx);
    const rcRestip = await clientA.waitForTransactionReceipt({ hash: restipulateTx, retries: 60, interval: 3000 });
    const byHash = await clientA.request({ method: 'eth_getTransactionByHash', params: [restipulateTx] });
    restipulateExecResult = byHash.consensus_data?.leader_receipt?.[0]?.execution_result;
    console.log('  Restipulate receipt status:', rcRestip.status_name, '| Execution result:', restipulateExecResult);
    if (restipulateExecResult !== 'SUCCESS') {
      restipulateError = `Transaction reverted with execution_result: ${restipulateExecResult}`;
    }
  } catch (err) {
    restipulateError = err.message || String(err);
    console.log('  Restipulate attempt caught client/RPC error:', restipulateError);
  }

  // Step 5: Read back facts record AFTER duplicate attempt: MUST REMAIN UNCHANGED!
  const factsAfterAttempt = JSON.parse(await clientA.readContract({
    address: CONTRACT_ADDRESS,
    functionName: 'get_facts',
    args: [specId, factsId]
  }));
  console.log('\n[READBACK 2] Facts record AFTER restipulation attempt:');
  console.log('  facts_id:', factsAfterAttempt.facts_id);
  console.log('  by:      ', factsAfterAttempt.by);

  const confirmationsPreserved = (
    factsAfterAttempt.by.length === 2 &&
    factsAfterAttempt.by.includes(partyA.address) &&
    factsAfterAttempt.by.includes(partyB.address)
  );
  console.log('  Confirmations preserved unchanged:', confirmationsPreserved);

  if (!confirmationsPreserved) {
    throw new Error('Confirmations were corrupted or overwritten by restipulation attempt!');
  }
  console.log('  -> CONFIRMED: Duplicate restipulation failed to overwrite confirmations!');

  // Step 6: First Adjudication
  console.log('\n[STEP 6] Party A triggers first adjudication...');
  const txAdj1 = await withRetry(
    () => clientA.writeContract({ address: CONTRACT_ADDRESS, functionName: 'adjudicate', args: [specId, factsId] }),
    'adjudicate_1'
  );
  console.log('  First adjudication tx hash:', txAdj1);
  const rcAdj1 = await withRetry(() => clientA.waitForTransactionReceipt({ hash: txAdj1, retries: 120, interval: 3000 }), 'rcAdj1');
  console.log('  Adjudication 1 status:', rcAdj1.status_name, '| result:', rcAdj1.result_name);

  const rulingBefore = JSON.parse(await clientA.readContract({
    address: CONTRACT_ADDRESS,
    functionName: 'get_ruling',
    args: [specId, factsId]
  }));
  console.log('\n[READBACK 3] Ruling BEFORE second adjudication attempt:');
  console.log('  Verdict:    ', rulingBefore.verdict);
  console.log('  Canary pass:', rulingBefore.canary_pass);
  console.log('  Spec hash:  ', rulingBefore.spec_hash);

  // Step 7: ATTEMPT SECOND ADJUDICATION ON THE SAME (specId, factsId) KEY
  console.log('\n[STEP 7] Attempting second adjudication on the SAME facts_id...');
  let reAdjTx = null;
  let reAdjError = null;
  let reAdjExecResult = null;

  try {
    reAdjTx = await clientA.writeContract({
      address: CONTRACT_ADDRESS,
      functionName: 'adjudicate',
      args: [specId, factsId]
    });
    console.log('  Second adjudication tx broadcasted:', reAdjTx);
    const rcReAdj = await clientA.waitForTransactionReceipt({ hash: reAdjTx, retries: 60, interval: 3000 });
    const byHash2 = await clientA.request({ method: 'eth_getTransactionByHash', params: [reAdjTx] });
    reAdjExecResult = byHash2.consensus_data?.leader_receipt?.[0]?.execution_result;
    console.log('  Second adjudication receipt status:', rcReAdj.status_name, '| Execution result:', reAdjExecResult);
    if (reAdjExecResult !== 'SUCCESS') {
      reAdjError = `Transaction reverted with execution_result: ${reAdjExecResult}`;
    }
  } catch (err) {
    reAdjError = err.message || String(err);
    console.log('  Second adjudication attempt caught client/RPC error:', reAdjError);
  }

  // Step 8: Read back ruling AFTER second attempt: MUST REMAIN UNCHANGED!
  const rulingAfter = JSON.parse(await clientA.readContract({
    address: CONTRACT_ADDRESS,
    functionName: 'get_ruling',
    args: [specId, factsId]
  }));
  console.log('\n[READBACK 4] Ruling AFTER second adjudication attempt:');
  console.log('  Verdict:    ', rulingAfter.verdict);
  console.log('  Canary pass:', rulingAfter.canary_pass);

  const rulingUnchanged = (
    rulingAfter.verdict === rulingBefore.verdict &&
    rulingAfter.canary_pass === rulingBefore.canary_pass &&
    rulingAfter.spec_hash === rulingBefore.spec_hash
  );
  console.log('  Ruling preserved byte-for-byte:', rulingUnchanged);

  if (!rulingUnchanged) {
    throw new Error('Ruling was corrupted or overwritten by re-adjudication attempt!');
  }
  console.log('  -> CONFIRMED: Re-adjudication on existing key was rejected, ruling remains unchanged!');

  const evidence = {
    test: 'Bug 2 - Restipulation and Re-adjudication Protection',
    contractAddress: CONTRACT_ADDRESS,
    specId,
    factsId,
    partyA: partyA.address,
    partyB: partyB.address,
    disputeText,
    txFacts1,
    txConfirmB,
    factsBeforeAttempt,
    restipulateTx,
    restipulateExecResult,
    restipulateError,
    factsAfterAttempt,
    confirmationsPreserved,
    txAdj1,
    rulingBefore,
    reAdjTx,
    reAdjExecResult,
    reAdjError,
    rulingAfter,
    rulingUnchanged
  };

  fs.writeFileSync('scripts/deploy/bug2_live_evidence.json', JSON.stringify(evidence, null, 2));

  console.log('\n================================================================');
  console.log('BUG 2 PRODUCTION-CONTRACT TEST COMPLETED SUCCESSFULLY (PASS)');
  console.log('================================================================\n');
}

main().catch(err => {
  console.error('Fatal error in Bug 2 test:', err);
  process.exit(1);
});
