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
  console.log('BUG 1 PRODUCTION-CONTRACT TEST: SCENARIO SUITE BINDING');
  console.log('Contract Address:', CONTRACT_ADDRESS);
  console.log('Target: Signatures must bind to scenario suite digest, and');
  console.log('        adding a scenario must block lock until re-signed.');
  console.log('================================================================\n');

  const partyA = createAccount();
  const partyB = createAccount();
  console.log('Party A address:', partyA.address);
  console.log('Party B address:', partyB.address);

  const clientA = createClient({ chain: chains.studionet, account: partyA });
  const clientB = createClient({ chain: chains.studionet, account: partyB });

  // Step 1: Party A creates spec
  const specTitle = 'Bug1 Suite Binding Live ' + Math.floor(Math.random() * 10000);
  const clause = 'The cloud service provider shall maintain monthly API uptime of at least 99.9% and respond to critical outage incidents within 1 hour.';
  const labelsCsv = 'COMPLIANT, VIOLATION';

  console.log(`\n[STEP 1] Party A creates spec: "${specTitle}"...`);
  const txCreate = await withRetry(
    () => clientA.writeContract({
      address: CONTRACT_ADDRESS,
      functionName: 'create_spec',
      args: [specTitle, clause, labelsCsv]
    }),
    'create_spec'
  );
  console.log('  txCreate hash:', txCreate);
  await withRetry(() => clientA.waitForTransactionReceipt({ hash: txCreate, retries: 120, interval: 3000 }), 'rcCreate');

  const rawLatest = await clientA.readContract({
    address: CONTRACT_ADDRESS,
    functionName: 'get_latest_spec',
    args: [partyA.address]
  });
  const specId = typeof rawLatest === 'string' ? rawLatest.replace(/^"|"$/g, '') : rawLatest;
  console.log('  Created spec_id:', specId);

  // Step 2: Party A invites Party B
  console.log('\n[STEP 2] Party A invites Party B...');
  const txInvite = await withRetry(
    () => clientA.writeContract({
      address: CONTRACT_ADDRESS,
      functionName: 'invite',
      args: [specId, partyB.address]
    }),
    'invite'
  );
  console.log('  txInvite hash:', txInvite);
  await withRetry(() => clientA.waitForTransactionReceipt({ hash: txInvite, retries: 120, interval: 3000 }), 'rcInvite');

  // Step 3: Add 4 initial scenarios (2 by A, 2 by B)
  console.log('\n[STEP 3] Proposing 4 scenarios (2 by Party A, 2 by Party B)...');
  const txSc1 = await withRetry(
    () => clientA.writeContract({
      address: CONTRACT_ADDRESS,
      functionName: 'add_scenario',
      args: [specId, 'The provider maintains 99.95% API uptime for the month and acknowledged the single outage alert within 20 minutes.', 'COMPLIANT']
    }),
    'add_scenario_1'
  );
  console.log('  Sc1 tx hash:', txSc1);
  await withRetry(() => clientA.waitForTransactionReceipt({ hash: txSc1, retries: 120, interval: 3000 }), 'rcSc1');

  const txSc2 = await withRetry(
    () => clientA.writeContract({
      address: CONTRACT_ADDRESS,
      functionName: 'add_scenario',
      args: [specId, 'The provider maintains 100% monthly availability with zero downtime and all healthchecks passing.', 'COMPLIANT']
    }),
    'add_scenario_2'
  );
  console.log('  Sc2 tx hash:', txSc2);
  await withRetry(() => clientA.waitForTransactionReceipt({ hash: txSc2, retries: 120, interval: 3000 }), 'rcSc2');

  const txSc3 = await withRetry(
    () => clientB.writeContract({
      address: CONTRACT_ADDRESS,
      functionName: 'add_scenario',
      args: [specId, 'A critical database outage occurs and the support team does not respond or investigate for 4 hours.', 'VIOLATION']
    }),
    'add_scenario_3'
  );
  console.log('  Sc3 tx hash:', txSc3);
  await withRetry(() => clientB.waitForTransactionReceipt({ hash: txSc3, retries: 120, interval: 3000 }), 'rcSc3');

  const txSc4 = await withRetry(
    () => clientB.writeContract({
      address: CONTRACT_ADDRESS,
      functionName: 'add_scenario',
      args: [specId, 'Monthly server availability drops to 98.5% due to repeated unscheduled infrastructure failures.', 'VIOLATION']
    }),
    'add_scenario_4'
  );
  console.log('  Sc4 tx hash:', txSc4);
  await withRetry(() => clientB.waitForTransactionReceipt({ hash: txSc4, retries: 120, interval: 3000 }), 'rcSc4');

  // Step 4: Run scenarios 1..4
  console.log('\n[STEP 4] Running scenarios 1..4...');
  for (let i = 1; i <= 4; i++) {
    const txRun = await withRetry(
      () => clientA.writeContract({
        address: CONTRACT_ADDRESS,
        functionName: 'run_scenario',
        args: [specId, i]
      }),
      `run_scenario_${i}`
    );
    console.log(`  run_scenario(${i}) tx: ${txRun}`);
    await withRetry(() => clientA.waitForTransactionReceipt({ hash: txRun, retries: 120, interval: 3000 }), `rcRun${i}`);
  }

  // Step 5: Read suite report before signing
  const repBeforeSign = JSON.parse(await clientA.readContract({
    address: CONTRACT_ADDRESS,
    functionName: 'suite_report',
    args: [specId]
  }));
  const digest4Scenarios = repBeforeSign.scenario_suite_digest;
  console.log('\n[STEP 5] Suite report before signing:');
  console.log('  scenario_suite_digest (4 scenarios):', digest4Scenarios);
  console.log('  ready_to_lock:', repBeforeSign.ready_to_lock);
  console.log('  lock_problems:', repBeforeSign.lock_problems);

  // Step 6: Both parties sign
  console.log('\n[STEP 6] Party A and Party B sign for the 4-scenario suite...');
  const txSignA1 = await withRetry(
    () => clientA.writeContract({ address: CONTRACT_ADDRESS, functionName: 'sign', args: [specId] }),
    'signA1'
  );
  console.log('  Party A sign tx:', txSignA1);
  await withRetry(() => clientA.waitForTransactionReceipt({ hash: txSignA1, retries: 120, interval: 3000 }), 'rcSignA1');

  const txSignB1 = await withRetry(
    () => clientB.writeContract({ address: CONTRACT_ADDRESS, functionName: 'sign', args: [specId] }),
    'signB1'
  );
  console.log('  Party B sign tx:', txSignB1);
  await withRetry(() => clientB.waitForTransactionReceipt({ hash: txSignB1, retries: 120, interval: 3000 }), 'rcSignB1');

  // Readback after both signed: lock MUST be reachable now!
  const repAfterBothSigned = JSON.parse(await clientA.readContract({
    address: CONTRACT_ADDRESS,
    functionName: 'suite_report',
    args: [specId]
  }));
  const specAfterBothSigned = JSON.parse(await clientA.readContract({
    address: CONTRACT_ADDRESS,
    functionName: 'get_spec',
    args: [specId]
  }));
  console.log('\n[READBACK 1] Lock eligibility with 4 scenarios signed:');
  console.log('  Signed map:', specAfterBothSigned.signed);
  console.log('  ready_to_lock:', repAfterBothSigned.ready_to_lock);
  console.log('  lock_problems:', repAfterBothSigned.lock_problems);
  if (!repAfterBothSigned.ready_to_lock) {
    throw new Error('Lock should be reachable after both signed 4 scenarios!');
  }
  console.log('  -> CONFIRMED: Lock is reachable!');

  // Step 7: Add ONE MORE scenario (Scenario 5)
  console.log('\n[STEP 7] Adding Scenario 5 (modifying the scenario suite)...');
  const txSc5 = await withRetry(
    () => clientA.writeContract({
      address: CONTRACT_ADDRESS,
      functionName: 'add_scenario',
      args: [specId, 'The provider experiences 15 minutes of scheduled maintenance announced 3 days prior, maintaining 99.96% uptime.', 'COMPLIANT']
    }),
    'add_scenario_5'
  );
  console.log('  Sc5 tx hash:', txSc5);
  await withRetry(() => clientA.waitForTransactionReceipt({ hash: txSc5, retries: 120, interval: 3000 }), 'rcSc5');

  console.log('  Running Scenario 5...');
  const txRun5 = await withRetry(
    () => clientA.writeContract({
      address: CONTRACT_ADDRESS,
      functionName: 'run_scenario',
      args: [specId, 5]
    }),
    'run_scenario_5'
  );
  console.log('  run_scenario(5) tx:', txRun5);
  await withRetry(() => clientA.waitForTransactionReceipt({ hash: txRun5, retries: 120, interval: 3000 }), 'rcRun5');

  // Step 8: Readback suite report: Lock MUST now be BLOCKED with stale-signature reasons!
  const repAfterSc5 = JSON.parse(await clientA.readContract({
    address: CONTRACT_ADDRESS,
    functionName: 'suite_report',
    args: [specId]
  }));
  const specAfterSc5 = JSON.parse(await clientA.readContract({
    address: CONTRACT_ADDRESS,
    functionName: 'get_spec',
    args: [specId]
  }));
  const digest5Scenarios = repAfterSc5.scenario_suite_digest;

  console.log('\n[READBACK 2] Lock status after Scenario 5 was added:');
  console.log('  Old Suite Digest (at signing time):', digest4Scenarios);
  console.log('  New Suite Digest (current 5 scs):  ', digest5Scenarios);
  console.log('  Stored signed map:                 ', specAfterSc5.signed);
  console.log('  ready_to_lock:                     ', repAfterSc5.ready_to_lock);
  console.log('  lock_problems:                     ', repAfterSc5.lock_problems);

  const stalePartyA = repAfterSc5.lock_problems.some(p => p.includes('must re-sign: scenario suite changed') && p.includes(partyA.address));
  const stalePartyB = repAfterSc5.lock_problems.some(p => p.includes('must re-sign: scenario suite changed') && p.includes(partyB.address));
  console.log(`  Stale signature problem for Party A (${partyA.address}):`, stalePartyA);
  console.log(`  Stale signature problem for Party B (${partyB.address}):`, stalePartyB);

  if (!stalePartyA || !stalePartyB || repAfterSc5.ready_to_lock) {
    throw new Error('Lock should be BLOCKED because scenario suite changed!');
  }
  console.log('  -> CONFIRMED: Lock is BLOCKED with specific stale signature reasons naming the parties who must re-sign!');

  // Step 9: Attempt to lock - verify transaction is rejected on-chain
  console.log('\n[STEP 9] Attempting to lock while signatures are stale...');
  let lockBlockedError = null;
  let txLockAttempt = null;
  try {
    txLockAttempt = await clientA.writeContract({
      address: CONTRACT_ADDRESS,
      functionName: 'lock',
      args: [specId]
    });
    console.log('  lock attempt broadcasted with hash:', txLockAttempt);
    const rcBlocked = await clientA.waitForTransactionReceipt({ hash: txLockAttempt, retries: 60, interval: 3000 });
    const byHash = await clientA.request({ method: 'eth_getTransactionByHash', params: [txLockAttempt] });
    const execRes = byHash.consensus_data?.leader_receipt?.[0]?.execution_result;
    console.log('  Receipt status:', rcBlocked.status_name, '| Execution result:', execRes);
    if (execRes !== 'SUCCESS') {
      lockBlockedError = `Transaction reverted on-chain with execution_result: ${execRes}`;
    }
  } catch (err) {
    lockBlockedError = err.message || String(err);
  }
  console.log('  Lock blocked outcome:', lockBlockedError);

  // Step 10: Re-sign with the new scenario suite
  console.log('\n[STEP 10] Parties re-sign with the new 5-scenario suite...');
  const txReSignA = await withRetry(
    () => clientA.writeContract({ address: CONTRACT_ADDRESS, functionName: 'sign', args: [specId] }),
    'reSignA'
  );
  console.log('  Party A re-sign tx:', txReSignA);
  await withRetry(() => clientA.waitForTransactionReceipt({ hash: txReSignA, retries: 120, interval: 3000 }), 'rcReSignA');

  const txReSignB = await withRetry(
    () => clientB.writeContract({ address: CONTRACT_ADDRESS, functionName: 'sign', args: [specId] }),
    'reSignB'
  );
  console.log('  Party B re-sign tx:', txReSignB);
  await withRetry(() => clientB.waitForTransactionReceipt({ hash: txReSignB, retries: 120, interval: 3000 }), 'rcReSignB');

  // Step 11: Readback suite report: Lock MUST now be reachable again!
  const repAfterReSign = JSON.parse(await clientA.readContract({
    address: CONTRACT_ADDRESS,
    functionName: 'suite_report',
    args: [specId]
  }));
  const specAfterReSign = JSON.parse(await clientA.readContract({
    address: CONTRACT_ADDRESS,
    functionName: 'get_spec',
    args: [specId]
  }));
  console.log('\n[READBACK 3] Lock status after re-signing:');
  console.log('  Updated signed map:', specAfterReSign.signed);
  console.log('  ready_to_lock:     ', repAfterReSign.ready_to_lock);
  console.log('  lock_problems:     ', repAfterReSign.lock_problems);

  if (!repAfterReSign.ready_to_lock) {
    throw new Error('Lock should be ready after re-signing with current suite digest!');
  }
  console.log('  -> CONFIRMED: Lock is reachable again after re-signing!');

  // Step 12: Call lock -> Lock succeeds!
  console.log('\n[STEP 12] Calling lock...');
  const txLockSuccess = await withRetry(
    () => clientA.writeContract({ address: CONTRACT_ADDRESS, functionName: 'lock', args: [specId] }),
    'lockSuccess'
  );
  console.log('  lock tx hash:', txLockSuccess);
  const rcLockSuccess = await withRetry(
    () => clientA.waitForTransactionReceipt({ hash: txLockSuccess, retries: 120, interval: 3000 }),
    'rcLockSuccess'
  );
  console.log('  lock receipt status:', rcLockSuccess.status_name, '| result:', rcLockSuccess.result_name);

  const finalSpec = JSON.parse(await clientA.readContract({
    address: CONTRACT_ADDRESS,
    functionName: 'get_spec',
    args: [specId]
  }));
  console.log('\n[FINAL ON-CHAIN SPEC READBACK]');
  console.log('  status:   ', finalSpec.status);
  console.log('  spec_hash:', finalSpec.spec_hash);
  console.log('  signed:   ', finalSpec.signed);

  const evidence = {
    test: 'Bug 1 - Scenario Suite Binding',
    contractAddress: CONTRACT_ADDRESS,
    specId,
    partyA: partyA.address,
    partyB: partyB.address,
    txCreate,
    txInvite,
    txSc1,
    txSc2,
    txSc3,
    txSc4,
    digest4Scenarios,
    txSignA1,
    txSignB1,
    txSc5,
    txRun5,
    digest5Scenarios,
    repAfterSc5_problems: repAfterSc5.lock_problems,
    txLockAttempt,
    lockBlockedError,
    txReSignA,
    txReSignB,
    txLockSuccess,
    finalStatus: finalSpec.status,
    finalSpecHash: finalSpec.spec_hash
  };

  fs.writeFileSync('scripts/deploy/bug1_live_evidence.json', JSON.stringify(evidence, null, 2));

  console.log('\n================================================================');
  console.log('BUG 1 PRODUCTION-CONTRACT TEST COMPLETED SUCCESSFULLY (PASS)');
  console.log('================================================================\n');
}

main().catch(err => {
  console.error('Fatal error in Bug 1 test:', err);
  process.exit(1);
});
