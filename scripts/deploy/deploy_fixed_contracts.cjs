const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const { createClient, chains, createAccount } = require('genlayer-js');
const fs = require('fs');
const crypto = require('crypto');

async function withRetry(fn, desc, maxRetries = 10, baseDelay = 3000) {
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

async function verifyOnChainSource(client, txHash, localFilePath) {
  console.log(`Verifying deployed code for tx ${txHash} against ${localFilePath}...`);
  const tx = await client.request({
    method: 'eth_getTransactionByHash',
    params: [txHash]
  });

  const hexStr = tx.tx_data.startsWith('0x') ? tx.tx_data.slice(2) : tx.tx_data;
  const rawBuf = Buffer.from(hexStr, 'hex');

  const codeIndex = rawBuf.indexOf('# v0.2.16');
  if (codeIndex === -1) {
    throw new Error('Could not find code marker # v0.2.16 in tx_data');
  }

  const localCode = fs.readFileSync(localFilePath, 'utf8');
  // For consumer, args might follow or code might go to end
  let onChainCode = rawBuf.subarray(codeIndex).toString('utf8');
  // Trim any trailing msgpack/args padding if necessary
  if (onChainCode.length > localCode.length) {
    onChainCode = onChainCode.slice(0, localCode.length);
  }

  const hashOnChain = crypto.createHash('sha256').update(onChainCode).digest('hex');
  const hashLocal = crypto.createHash('sha256').update(localCode).digest('hex');

  console.log('  Local file SHA-256:   ', hashLocal);
  console.log('  On-chain code SHA-256:', hashOnChain);
  const match = (hashOnChain === hashLocal);
  console.log('  Byte-for-byte match:  ', match);

  if (!match) {
    throw new Error(`Source hash mismatch for ${localFilePath}!`);
  }

  return { hashLocal, hashOnChain, match };
}

async function main() {
  console.log('====================================================');
  console.log('DEPLOYING FIXED CLAUSELAB & CONSUMER TO STUDIONET');
  console.log('====================================================\n');

  const deployer = createAccount();
  console.log('Deployer address:', deployer.address);

  const client = createClient({
    chain: chains.studionet,
    account: deployer
  });

  // 1. Deploy ClauseLab.py
  console.log('\n[1/4] Reading contracts/ClauseLab.py...');
  const clauseLabCode = fs.readFileSync('contracts/ClauseLab.py', 'utf8');
  console.log(`ClauseLab code length: ${clauseLabCode.length} bytes`);

  console.log('Deploying ClauseLab.py...');
  const deployTxClauseLab = await withRetry(
    () => client.deployContract({ code: clauseLabCode, args: [] }),
    'deployContract ClauseLab'
  );
  console.log('ClauseLab Deploy Tx Hash:', deployTxClauseLab);

  const receiptClauseLab = await withRetry(
    () => client.waitForTransactionReceipt({ hash: deployTxClauseLab, retries: 120, interval: 3000 }),
    'wait for ClauseLab receipt'
  );
  const clauseLabAddress = receiptClauseLab.recipient;
  console.log('ClauseLab Deployed Address:', clauseLabAddress);

  if (!clauseLabAddress) {
    throw new Error('No recipient address in ClauseLab deploy receipt');
  }

  // 2. Verify ClauseLab.py on-chain source
  console.log('\n[2/4] Verifying ClauseLab on-chain source hash...');
  const verifyClauseLab = await verifyOnChainSource(client, deployTxClauseLab, 'contracts/ClauseLab.py');

  // 3. Deploy ClauseLabConsumer.py pointed to new ClauseLab address
  console.log('\n[3/4] Reading examples/consumer/consumer.py...');
  const consumerCode = fs.readFileSync('examples/consumer/consumer.py', 'utf8');
  console.log(`Consumer code length: ${consumerCode.length} bytes`);

  console.log(`Deploying ClauseLabConsumer with clauselab_address = ${clauseLabAddress}...`);
  const deployTxConsumer = await withRetry(
    () => client.deployContract({ code: consumerCode, args: [clauseLabAddress] }),
    'deployContract Consumer'
  );
  console.log('Consumer Deploy Tx Hash:', deployTxConsumer);

  const receiptConsumer = await withRetry(
    () => client.waitForTransactionReceipt({ hash: deployTxConsumer, retries: 120, interval: 3000 }),
    'wait for Consumer receipt'
  );
  const consumerAddress = receiptConsumer.recipient;
  console.log('Consumer Deployed Address:', consumerAddress);

  if (!consumerAddress) {
    throw new Error('No recipient address in Consumer deploy receipt');
  }

  // 4. Verify ClauseLabConsumer.py on-chain source
  console.log('\n[4/4] Verifying Consumer on-chain source hash...');
  const verifyConsumer = await verifyOnChainSource(client, deployTxConsumer, 'examples/consumer/consumer.py');

  // Summary and output saving
  const deployResult = {
    network: 'studionet',
    chainId: 61999,
    rpcUrl: 'https://studio.genlayer.com/api',
    explorerBaseUrl: 'https://explorer-studio.genlayer.com/address/',
    contractAddress: clauseLabAddress,
    deployTxHash: deployTxClauseLab,
    sourceSha256: verifyClauseLab.hashLocal,
    consumerContractAddress: consumerAddress,
    consumerDeployTxHash: deployTxConsumer,
    consumerSourceSha256: verifyConsumer.hashLocal,
    deployedAt: new Date().toISOString()
  };

  console.log('\n====================================================');
  console.log('DEPLOYMENT COMPLETE AND VERIFIED');
  console.log(JSON.stringify(deployResult, null, 2));
  console.log('====================================================');

  fs.writeFileSync('scripts/deploy/latest_deployment.json', JSON.stringify(deployResult, null, 2));
}

main().catch(err => {
  console.error('Fatal deployment error:', err);
  process.exit(1);
});
