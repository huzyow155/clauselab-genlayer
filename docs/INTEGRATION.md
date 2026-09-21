# ClauseLab Integration Guide for Frontend & dApp Developers

## 1. Network & Client Configuration

- **Target Network**: GenLayer Studionet
- **Chain ID**: `61999`
- **JSON-RPC Endpoint**: `https://studio.genlayer.com/api`
- **Block Explorer**: `https://explorer-studio.genlayer.com/address/<CONTRACT_ADDRESS>`
- **SDK**: `genlayer-js@^1.1.8`
- **Chain Object**: `chains.studionet`

### Connecting with `genlayer-js`
```javascript
import { createClient, chains } from 'genlayer-js';

// With MetaMask or window.ethereum:
const client = createClient({
  chain: chains.studionet,
  // Pass user's browser provider / wallet
});
```

> [!IMPORTANT]
> **Transaction Success Semantics**:
> In GenLayer, transactions are first `ACCEPTED` by the rollup and then judged by validators. A successful write has:
> - `receipt.status_name === "ACCEPTED"`
> - `receipt.result_name === "MAJORITY_AGREE"`
> - `receipt.consensus_data.leader_receipt[0].execution_result === "SUCCESS"`
> If execution fails (reverts with a user error), `result_name` will be `"MAJORITY_DISAGREE"` or `status_name` will be `"UNDETERMINED"`, with the error payload in `result.payload`.
> **Never treat ACCEPTED alone as success.**
>
> **Read-After-Write Paradigm**:
> On-chain write methods do not return values directly to the caller transaction receipt. The frontend must execute a `readContract` call immediately following confirmation to retrieve updated state.

---

## 2. Public Methods Reference

### 2.1 `create_spec`
- **Type**: Write
- **Description**: Initiates a new agreement spec in `DRAFT` status. Author is assigned as the first party.
- **Arguments**:
  - `title` (`str`): e.g. `"Software Delivery Agreement"` (max 200 chars)
  - `clause` (`str`): e.g. `"The contractor shall deliver the repository with pure ASCII code and passing tests within 7 calendar days."` (max 2000 chars)
  - `labels_csv` (`str`): e.g. `"DELIVERED, BREACH"` (2 to 5 comma-separated uppercase labels)
- **User Errors Raised**:
  - `"clause exceeds 2000 characters"`
  - `"title exceeds 200 characters"`
  - `"bad label: <LABEL>"`
  - `"need 2..5 labels"`
  - `"spec already exists"`
- **Measured Latency**: ~3.5s

### 2.2 `invite`
- **Type**: Write
- **Description**: Invites an additional party to a draft spec.
- **Arguments**:
  - `spec_id` (`str`): 12-character hex ID (e.g. `"349d3937fe00"`)
  - `party` (`str`): 42-character Ethereum address (e.g. `"0x54d991Da3fA3c0284A3409f26F12a9E0d69bbadb"`)
- **User Errors Raised**:
  - `"unknown spec"`
  - `"spec is not in DRAFT status"`
  - `"author only can invite parties"`
  - `"maximum 4 parties reached"`
- **Measured Latency**: ~3.2s

### 2.3 `add_scenario`
- **Type**: Write
- **Description**: Proposes a hypothetical case with an expected outcome.
- **Arguments**:
  - `spec_id` (`str`): e.g. `"349d3937fe00"`
  - `text` (`str`): e.g. `"Contractor provides the complete software package on day 2."` (max 600 chars)
  - `expected` (`str`): e.g. `"DELIVERED"` (must be in spec's labels)
- **User Errors Raised**:
  - `"unknown spec"`
  - `"spec is not in DRAFT status"`
  - `"sender is not a party"`
  - `"scenario text exceeds 600 characters"`
  - `"expected label not in allowed labels: <LABEL>"`
- **Measured Latency**: ~3.3s

### 2.4 `run_scenario`
- **Type**: Write (Consensus)
- **Description**: Triggers validator consensus to classify a scenario against the current clause version.
- **Arguments**:
  - `spec_id` (`str`): e.g. `"349d3937fe00"`
  - `n` (`int`): Scenario 1-based index (e.g. `1`)
- **Consensus Return**: Canonical label string (e.g. `"DELIVERED"`)
- **User Errors Raised**:
  - `"unknown spec"`
  - `"cannot run scenario after lock"`
  - `"unknown scenario: <n>"`
- **Measured Latency**: ~23.5s (involves 1 LLM inference round per validator)

### 2.5 `amend`
- **Type**: Write
- **Description**: Updates the clause text, increments version, and clears all signatures. All prior scenario results become stale.
- **Arguments**:
  - `spec_id` (`str`): e.g. `"349d3937fe00"`
  - `new_clause` (`str`): Revised clause text (max 2000 chars)
- **User Errors Raised**:
  - `"unknown spec"`
  - `"cannot amend after lock"`
  - `"sender is not a party"`
  - `"clause exceeds 2000 characters"`
- **Measured Latency**: ~3.4s

### 2.6 `sign`
- **Type**: Write
- **Description**: Records party signature for the current clause version.
- **Arguments**:
  - `spec_id` (`str`): e.g. `"349d3937fe00"`
- **User Errors Raised**:
  - `"unknown spec"`
  - `"cannot sign after lock"`
  - `"sender is not a party"`
  - `"party has already signed current version"`
- **Measured Latency**: ~3.2s

### 2.7 `lock`
- **Type**: Write
- **Description**: Validates lock preconditions and locks the spec, storing an immutable `spec_hash`.
- **Arguments**:
  - `spec_id` (`str`): e.g. `"349d3937fe00"`
- **Preconditions**:
  - Spec must be `DRAFT`.
  - At least 4 scenarios present.
  - At least 2 distinct expected labels.
  - Every party must have proposed at least one scenario.
  - Every party must have signed current version.
  - Every scenario must be run at current version and matched (`matches == true`).
  - Canary scenario available.
- **User Errors Raised**:
  - `"lock problems: <semicolon-separated list of failures>"`
- **Measured Latency**: ~3.5s

### 2.8 `stipulate_facts`
- **Type**: Write
- **Description**: Files factual claims regarding a dispute under a locked spec.
- **Arguments**:
  - `spec_id` (`str`): e.g. `"349d3937fe00"`
  - `text` (`str`): Natural language facts (max 1500 chars)
- **User Errors Raised**:
  - `"unknown spec"`
  - `"spec is not LOCKED"`
  - `"sender is not a party"`
  - `"facts text exceeds 1500 characters"`
- **Measured Latency**: ~3.2s

### 2.9 `confirm_facts`
- **Type**: Write
- **Description**: Counterparty confirmation of stipulated facts. Two distinct parties confirm facts before adjudication is permitted.
- **Arguments**:
  - `spec_id` (`str`): e.g. `"349d3937fe00"`
  - `facts_id` (`str`): 12-character hex ID (e.g. `"8bc4921f001a"`)
- **User Errors Raised**:
  - `"unknown spec"`
  - `"spec is not LOCKED"`
  - `"sender is not a party"`
  - `"unknown facts: <facts_id>"`
  - `"party has already confirmed these facts"`
- **Measured Latency**: ~3.3s

### 2.10 `adjudicate`
- **Type**: Write (Consensus)
- **Description**: Executes validator adjudication with in-band canary calibration. Returns `VERDICT|CANARY_PASS`.
- **Arguments**:
  - `spec_id` (`str`): e.g. `"349d3937fe00"`
  - `facts_id` (`str`): e.g. `"8bc4921f001a"`
- **Consensus Return**: `"VERDICT|1"` or `"UNRELIABLE|0"`
- **User Errors Raised**:
  - `"unknown spec"`
  - `"spec is not LOCKED"`
  - `"unknown facts: <facts_id>"`
  - `"facts unconfirmed: need at least 2 distinct parties"`
  - `"ruling already exists for these facts"`
- **Measured Latency**: ~42s (involves 2 LLM inference rounds per validator)

---

## 3. Views & Read-Back Formats

### 3.1 `get_spec(spec_id: str) -> str`
```json
{
  "schema_version": "1.0",
  "spec_id": "349d3937fe00",
  "author": "0x12e3017c6009a630BFd1e3374864E7727EedCE3D",
  "title": "Software Delivery Agreement",
  "clause": "The contractor shall deliver the complete repository with pure ASCII code and passing tests within 7 calendar days of contract creation.",
  "labels": ["DELIVERED", "BREACH"],
  "version": 2,
  "status": "LOCKED",
  "parties": [
    "0x12e3017c6009a630BFd1e3374864E7727EedCE3D",
    "0x54d991Da3fA3c0284A3409f26F12a9E0d69bbadb"
  ],
  "signed": [
    "0x12e3017c6009a630BFd1e3374864E7727EedCE3D",
    "0x54d991Da3fA3c0284A3409f26F12a9E0d69bbadb"
  ],
  "n_scenarios": 4,
  "spec_hash": "e6741b695123d..."
}
```

### 3.2 `get_scenario(spec_id: str, n: int) -> str`
```json
{
  "schema_version": "1.0",
  "spec_id": "349d3937fe00",
  "n": 2,
  "text": "Contractor provides the complete software package with full passing tests on day 2.",
  "expected": "DELIVERED",
  "proposer": "0x12e3017c6009a630BFd1e3374864E7727EedCE3D",
  "ran_version": 2,
  "label": "DELIVERED",
  "matches": true
}
```

### 3.3 `suite_report(spec_id: str) -> str`
```json
{
  "schema_version": "1.0",
  "spec_id": "349d3937fe00",
  "version": 2,
  "total_scenarios": 4,
  "red_scenarios": [],
  "stale_scenarios": [],
  "green_scenarios": [1, 2, 3, 4],
  "label_distribution": {
    "DELIVERED": 2,
    "BREACH": 2
  },
  "ready_to_lock": true,
  "lock_problems": []
}
```

### 3.4 `get_ruling(spec_id: str, facts_id: str) -> str`
```json
{
  "schema_version": "1.0",
  "spec_id": "349d3937fe00",
  "facts_id": "8bc4921f001a",
  "verdict": "DELIVERED",
  "canary_pass": true,
  "spec_hash": "e6741b695123d..."
}
```

---

## 4. Discovery Views (No Frontend ID Hashing)
The frontend never computes IDs or hashes manually. Use these views:
- `get_specs_by_party(party_address: str, limit: int = 20) -> str`: Returns JSON array of `spec_id`s where address is a party.
- `get_latest_spec(author_address: str) -> str`: Returns the latest `spec_id` created by an author.
- `get_facts(spec_id: str, facts_id: str) -> str`: Returns facts record.
- `get_latest_facts_id(spec_id: str) -> str`: Returns the latest facts ID created for a spec.
