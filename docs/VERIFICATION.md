# ClauseLab On-Chain Verification & Latency Report

## 1. Build & Source Verification
- **Network**: GenLayer Studionet
- **Chain ID**: `61999`
- **JSON-RPC Endpoint**: `https://studio.genlayer.com/api`
- **Block Explorer**: [https://explorer-studio.genlayer.com/address/0x13ac18867642fdCd740EA14c6EA7588abdCb7F73](https://explorer-studio.genlayer.com/address/0x13ac18867642fdCd740EA14c6EA7588abdCb7F73)
- **Contract Name**: `ClauseLab`
- **Final Contract Address**: `0x13ac18867642fdCd740EA14c6EA7588abdCb7F73`
- **Deploy Transaction**: `0xc5f20bf7bdd3d2569f1edfd0719d3d21fd98a128e976ce7a8d71b288aab391ec`
- **Consumer Contract Address**: `0x97B9c47d0d5750ff8d8FED3C846DB966e7b0ba0B`
- **Consumer Deploy Transaction**: `0xc6654e301e3f6599bdf76379c786804b7cc9e20051119aba1b18e8155d635d00`
- **Source File**: `contracts/ClauseLab.py`
- **Source SHA-256**: `812f70508bb321c0b27664f51055293fa08d5f737054111037d1a3294f034554`
- **Consumer Source SHA-256**: `0cb11e6c617b8e4686aff24af1f83fbf028350a31f1d95e7465b3e7914dd6438`
- **ASCII Scan**: Pure ASCII (`PASSED: 21259 bytes`)
- **GenVM Linter**: 0 errors, 0 warnings

### Superseded Deployments
- `0xf227D68595178A2192888c85E3550fEff4b79406`: Prior deployment superseded by Oct 4 2026 steward-requested security upgrade (Bug 1 scenario suite binding + Bug 2 anti-restipulation protections).
- `0x9Ec4C9ad7B6fAb7490650F1A17D5b1129383a2F2`: Earlier interrupted run superseded by full complete lifecycle run on `0xf227D68595178A2192888c85E3550fEff4b79406`.
- `0x9bE44666E74A92371bae1f33B1a1AcE091FFab7E`: Milestone 1 ClauseLabCore minimal prototype.
- `0xd4c24cc41dFEa72B7eB313D600Edf09FC9F5C8dc`: Milestone 0 Probe diagnostic contract.

---

## 2. Test Suite Execution
Local tests executed with `python -m unittest discover tests -v`:
- **Layer 1 (Pure Unit Tests)**: 8 passed (label parsing, anchor determinism, canary disjointness, lock problems reporting, spec hash mutation).
- **Layer 2 (Mocked LLM Tests)**: 8 passed (mismatching scenario blocks lock, UNDECIDABLE scenario red, malformed JSON handling, canary failure yields UNRELIABLE star test, prompt injection containment, amendment invalidation, lock gating, fact confirmation by 2 distinct parties).
- **Layer 3 (Consensus Simulation Tests)**: 4 passed (strict_eq agreement, split validator disagreement, canary disagreement, undecidable scenario consensus).
- **Biased Judge Test**: 1 passed (biased judge unconditionally favoring contractor is caught and flagged via canary calibration).
- **Total Local Unit Tests**: 21 passed (0 failures, 0 errors).

> [!IMPORTANT]
> **UNRELIABLE Ruling Occurrence**:
> An `UNRELIABLE` ruling was **shown in mocks only** (in unit test `test_biased_judge_always_favoring_contractor_is_flagged` where a mock judge was programmed to unconditionally favor the contractor).
> In our live Studionet deployment, the validator model accurately judged both the canary test and the disputed facts, yielding `DELIVERED` with `canary_pass: true`.

---

## 3. Live On-Chain Transaction Table (Studionet)

Every transaction below was queried directly from GenLayer Studionet RPC and finalized by multi-validator consensus:

| # | Step / Action | Transaction Hash | Consensus Result | Status | Leader Execution | Return / Error Payload |
|---|---|---|---|---|---|---|
| 1 | `deployContract` (ClauseLab) | `0xf2d7bfa406a46cef66fa643a8eb3dae7f35e94efa0e622600a47c9cf494a89c2` | `MAJORITY_AGREE` | `FINALIZED` | **`SUCCESS`** | Recipient: `0xf227D68595178A2192888c85E3550fEff4b79406` |
| 2 | `createSpec` (Vague Clause) | `0xadc9217a1ed9cbdbf8782928714767cf795e10676e80f10b14d28247f7c768a9` | `MAJORITY_AGREE` | `FINALIZED` | **`SUCCESS`** | Spec ID: `"20f3293644c0"` |
| 3 | `invitePartyB` | `0xffc2a74a153b1c9acfc9a6b452d3a1f5e00bec79b113cd8a1fc484be2cf01cec` | `MAJORITY_AGREE` | `FINALIZED` | **`SUCCESS`** | Party B added to spec |
| 4 | `addScenario1` (Party A) | `0x1d94c960aa1397a35db8a43100afc9dde0f3121c599302244406465528e83fd6` | `MAJORITY_AGREE` | `FINALIZED` | **`SUCCESS`** | Scenario index: `1` |
| 5 | `addScenario2` (Party A) | `0x520eb597dd0326a140bee1184aeed637f5bba425b1e314a041b083a1b6aa6677` | `MAJORITY_AGREE` | `FINALIZED` | **`SUCCESS`** | Scenario index: `2` |
| 6 | `addScenario3` (Party B, boundary) | `0x4da64ff4e68cc49d8f59e69ee93b58ee58a5fa8c75842e09f05f673d756f4f29` | `MAJORITY_AGREE` | `FINALIZED` | **`SUCCESS`** | Scenario index: `3` |
| 7 | `addScenario4` (Party B) | `0x1ff60add1896cfbe9aea2fbf82fbe4be266801bd4ffc5bf1cff8ade90ef6cf8c` | `MAJORITY_AGREE` | `FINALIZED` | **`SUCCESS`** | Scenario index: `4` |
| 8 | `runScenarioVague` (Scenario 3) | `0x87b6b38363ddbe9b9bbfa9ba4d9d06ce6811ae391814752e5b3bad5b7c1ad4ee` | `MAJORITY_AGREE` | `FINALIZED` | **`SUCCESS`** | `"UNDECIDABLE"` (Ambiguity detected, turns RED) |
| 9 | `lockVagueRevert` (Blocked Lock) | `0xf005b90a2774b1bd3cbe17b8d77db951565f04d1f63e0fea08b94f10ab500934` | `MAJORITY_AGREE` | `FINALIZED` | **`ERROR`** | `rollback`: `"lock problems: scenario 3 is red"` |
| 10 | `amendClause` (Clarify to 7 days) | `0xd923fd2858ebd1a78ab6f1272d29bbd92a74698b6690fe214e413fa48403ee3c` | `MAJORITY_AGREE` | `FINALIZED` | **`SUCCESS`** | Clause updated, version 2, signatures cleared |
| 11 | `signPartyA` (Version 2) | `0xefb7ece24408c65438020e44a001a92d9677e28a5388d28b1f555137e3ae1a2b` | `MAJORITY_AGREE` | `FINALIZED` | **`SUCCESS`** | Party A signed |
| 12 | `signPartyB` (Version 2) | `0xf6cab561688adca628951f09601743eed2ff4a14a58a0f1134f80cef6b230b2a` | `MAJORITY_AGREE` | `FINALIZED` | **`SUCCESS`** | Party B signed |
| 13 | `lockSpec` (Version 2 Lock) | `0xcd8e5a1c69606b96df7405ed7a3ec5a9c74bf45e05fa42febe0ab26c83f610d1` | `MAJORITY_AGREE` | `FINALIZED` | **`SUCCESS`** | Locked hash: `"ca1a92e7a869960991fd9be2c797b3a8c21b6dfe0a11d7e4292bdad1bcd5571c"` |
| 14 | `stipulateFacts` (Party A) | `0x7071f83194855f551f47a4375da4cfce8a6252b3b16bc8ed664a488742d7042f` | `MAJORITY_AGREE` | `FINALIZED` | **`SUCCESS`** | Facts ID: `"f1830b46947f"` |
| 15 | `confirmFacts` (Party B) | `0xc1e62bd037bc5cadb44134496a422c251d081cfdf9842f03ff7e92be93d17886` | `MAJORITY_AGREE` | `FINALIZED` | **`SUCCESS`** | Facts confirmed by 2 distinct parties |
| 16 | `adjudicate` (Canary + Ruling) | `0x567fc073a4f0aa45c262b28705122d0537f70f51b0fea2032ebbb421742ce72d` | `MAJORITY_AGREE` | `FINALIZED` | **`SUCCESS`** | `"DELIVERED\|1"` (`canary_pass: true`) |
| 17 | `deployConsumer` (Consumer) | `0x12adde0727804c01062fcb5be5c2b980afc70c1aa745cf2fb39f53a94a267406` | `MAJORITY_AGREE` | `FINALIZED` | **`SUCCESS`** | Recipient: `0x9Fe97e71A0eeF88594abDea901B978519C98df34` |
| 18 | `consumerSettle` (Cross-contract) | `0xec2882dec8951367d93de014a8a2f367db1e4c625d8c5e62a1fe6ea83dcee927` | `MAJORITY_AGREE` | `FINALIZED` | **`SUCCESS`** | Settled verdict: `"DELIVERED"` |

### Raw Receipt Status Proof: `status_name: "FINALIZED"`

In GenLayer's transaction lifecycle:
1. Immediately upon consensus execution by the validators, a transaction receipt is returned with `status: 5` or `6` (`status_name: "ACCEPTED"`).
2. Accepted results become finalized once the appeal window closes without an appeal challenge.
3. For all 18 transactions above, the appeal window has elapsed (`appeal_validators_timeout: false`, transactions created on `2026-09-21`), and the Studionet RPC literally returns `status: 7` and `status_name: "FINALIZED"`.

Below is the literal excerpt queried directly from Studionet RPC for transaction `0xf2d7bfa406a46cef66fa643a8eb3dae7f35e94efa0e622600a47c9cf494a89c2` (deploy contract):

```json
{
  "hash": "0xf2d7bfa406a46cef66fa643a8eb3dae7f35e94efa0e622600a47c9cf494a89c2",
  "status": 7,
  "status_name": "FINALIZED",
  "result": 6,
  "result_name": "MAJORITY_AGREE",
  "appeal_validators_timeout": false
}
```

---

## 4. Blocked Lock Evidence: Raw Receipt & Error Payload

When `lock("20f3293644c0")` was attempted while Scenario 3 remained classified as `UNDECIDABLE` (red), the contract threw a `gl.vm.UserError`. The transaction was processed by the network, consensus agreed that the execution errored, and the leader receipt rolled back the state.

### Error Payload
```
"lock problems: scenario 3 is red"
```

### Raw Receipt JSON
```json
{
  "hash": "0xf005b90a2774b1bd3cbe17b8d77db951565f04d1f63e0fea08b94f10ab500934",
  "from_address": "0x8D99B01692b2c16A5Cda7c30e1aAeeDC69eE5031",
  "to_address": "0xf227D68595178A2192888c85E3550fEff4b79406",
  "data": {
    "calldata": {
      "readable": "{\"args\":[\"20f3293644c0\",]\"method\":\"lock\"}"
    }
  },
  "status": 7,
  "status_name": "FINALIZED",
  "result": 6,
  "result_name": "MAJORITY_AGREE",
  "consensus_data": {
    "votes": {
      "0x4EDbE1FC9EAeC7b0EBA849b0C76AE73Eb0ad5C47": "idle",
      "0x4aba638Cf0Cf5249437AaD968fC69dde46ae6BAC": "agree",
      "0x6737ca1d6BDF8b7C4f19143E2D55581Ca64eb7C3": "agree",
      "0x76c25AFC12c75485703cCFfd0083AA6201455B25": "idle",
      "0x90402341F0B0e97b23023c0a87de957FB7148E0F": "agree"
    },
    "leader_receipt": [
      {
        "execution_result": "ERROR",
        "genvm_result": {
          "stderr": "",
          "stdout": "",
          "raw_error": null,
          "error_code": null,
          "error_description": null
        },
        "mode": "leader",
        "vote": null,
        "calldata": {
          "readable": "{\"args\":[\"20f3293644c0\",]\"method\":\"lock\"}"
        },
        "result": {
          "status": "rollback",
          "payload": "lock problems: scenario 3 is red"
        }
      }
    ],
    "validators": [
      {
        "execution_result": "ERROR",
        "mode": "validator",
        "vote": "agree"
      },
      {
        "execution_result": "ERROR",
        "mode": "validator",
        "vote": "agree"
      },
      {
        "execution_result": "ERROR",
        "mode": "validator",
        "vote": "agree"
      }
    ]
  }
}
```

---

## 5. Measured Latency Breakdown
- **Single LLM Consensus Write (`run_scenario`)**: `11.85s` (typical ~12s)
- **Dual LLM Consensus Write (`adjudicate` with canary calibration)**: `28.47s` (typical ~28s)
- **Standard State Writes (`create_spec`, `amend`, `sign`, `lock`, `confirm`)**: `2.8s - 3.8s`

---

## 6. Oct 4 2026 Production-Contract Verification (Bug 1 & Bug 2)

Following steward review (PAPITO, Oct 4 2026), `ClauseLab.py` was updated with two security protections and deployed to Studionet at `0x13ac18867642fdCd740EA14c6EA7588abdCb7F73`.

### 6.1 Source Hash Match Proof
- **Contract**: `ClauseLab`
- **Address**: `0x13ac18867642fdCd740EA14c6EA7588abdCb7F73`
- **Deploy Transaction**: `0xc5f20bf7bdd3d2569f1edfd0719d3d21fd98a128e976ce7a8d71b288aab391ec`
- **Local Source SHA-256**: `812f70508bb321c0b27664f51055293fa08d5f737054111037d1a3294f034554`
- **On-Chain Code SHA-256**: `812f70508bb321c0b27664f51055293fa08d5f737054111037d1a3294f034554`
- **Exact Byte-for-Byte Match**: `true`

- **Consumer Contract**: `ClauseLabConsumer`
- **Address**: `0x97B9c47d0d5750ff8d8FED3C846DB966e7b0ba0B`
- **Deploy Transaction**: `0xc6654e301e3f6599bdf76379c786804b7cc9e20051119aba1b18e8155d635d00`
- **Local Source SHA-256**: `0cb11e6c617b8e4686aff24af1f83fbf028350a31f1d95e7465b3e7914dd6438`
- **On-Chain Code SHA-256**: `0cb11e6c617b8e4686aff24af1f83fbf028350a31f1d95e7465b3e7914dd6438`
- **Exact Byte-for-Byte Match**: `true`

### 6.2 Bug 1 Live Production Test (Scenario Suite Binding)
Tested on Studionet contract `0x13ac18867642fdCd740EA14c6EA7588abdCb7F73`:
- **Spec ID**: `e09aff7fb734`
- **Party A**: `0xdDD223cAe3681B7Cb5B41De1B87f341a45030481`
- **Party B**: `0xc03055cff6b316f90Ef928209832b766531d4a4c`
- **Initial Suite Digest (4 Scenarios)**: `0e0fada7585ed5709f4ff724fab4e9066a65352784714c88adbdbd619db7268e`
- **Initial Party A Sign Tx**: `0xe05dad2b88cc83c5348726b63b74c8c0d3bb43632fca4e859abb738d834ea0d9`
- **Initial Party B Sign Tx**: `0x16067174594a7463f35db2c3d1821c15de3f5fe8be90078927a08d2e54cb54ed`
- **Pre-Mutation State**: `ready_to_lock: true`, `lock_problems: []`
- **Scenario 5 Added (Tx)**: `0x63271dc9c77bfa9ac0cea3fdb7c23732ea01eaa87a0f7ea1eb568890769c640b`
- **Scenario 5 Run (Tx)**: `0x38f429525399973d58f0f542890cf41117dd1551155cc984e7bb3d051b54a539`
- **Mutated Suite Digest (5 Scenarios)**: `b04d4f847626adbc98fbcfba1282c2e7aad7bfa2608de4f701b7fac6bc6b4574`
- **Post-Mutation Lock Status**: `ready_to_lock: false`
- **Lock Problems Reported**:
  - `"party 0xdDD223cAe3681B7Cb5B41De1B87f341a45030481 must re-sign: scenario suite changed since their last signature"`
  - `"party 0xc03055cff6b316f90Ef928209832b766531d4a4c must re-sign: scenario suite changed since their last signature"`
- **Stale Lock Attempt Tx**: `0x2bba25b2997f6ee697401af69a24409e4917fd545d2dd9c6e8764e73edbac834` (Reverted on-chain with `execution_result: ERROR`)
- **Party A Re-Sign Tx**: `0x9d4326cb04452c8a7c9068e7784649f5761875cf27b13f5d96daea1b88f47b4a`
- **Party B Re-Sign Tx**: `0x0bd0e6d3a7bd07cb97e00bd57675f37462ef5ae296ff5a3094c9701818fb0ef0`
- **Post-Resign State**: `ready_to_lock: true`, `lock_problems: []`
- **Lock Success Tx**: `0x3445ff31d5aa2a43631d468a23091990ac071e62af74336b9c6320a5b8fc1d8c`
- **Locked Spec Hash**: `91618601478b2ba58cf3803dad44f565692a067828595d7cc2d8e7ebf38a1efa`
- **Result**: **PASS**

### 6.3 Bug 2 Live Production Test (Restipulation & Re-Adjudication Protection)
Tested on Studionet contract `0x13ac18867642fdCd740EA14c6EA7588abdCb7F73`:
- **Spec ID**: `024a90ad28fe`
- **Party A**: `0xE93459E8c78397468125a300dd7650c391b2a1D1`
- **Party B**: `0x29b8567b0fb75CaC2aa3185BfC745c263EebBC9d`
- **Stipulate Facts Tx**: `0x6430f3a97029e06eb530e07b94be5d1a65dbf34951c2e6f96ed1e7bf878a8588`
- **Facts ID**: `c9de95afdad5`
- **Confirm Facts Tx**: `0x2378c3d3a1cc5e2ff0b2947ef87718c512164db62088f76ba6c5e98f707bf5c0`
- **Confirmations Record Before Restipulation Attempt**:
  `["0xE93459E8c78397468125a300dd7650c391b2a1D1", "0x29b8567b0fb75CaC2aa3185BfC745c263EebBC9d"]`
- **Duplicate Restipulation Attempt Tx**: `0xc6c02af04ba6d7497738644c333dc3e6804b7a0a1289be37e4eaba660f88eba5` (Reverted on-chain with `execution_result: ERROR`)
- **Confirmations Record After Restipulation Attempt**:
  `["0xE93459E8c78397468125a300dd7650c391b2a1D1", "0x29b8567b0fb75CaC2aa3185BfC745c263EebBC9d"]` (**Preserved Unchanged: true**)
- **Adjudication 1 Tx**: `0x7837b2eacad5e376d7443d8ae55835a80872788b1f10faed5a3b0a751ec90886` (`verdict: COMPLIANT`, `canary_pass: true`)
- **Second Adjudication Attempt Tx**: `0xa4e3fcb2f2cf75596784c0cd16e7b097e93f7a75f45834dc294cc844b944ad16` (Reverted on-chain with `execution_result: ERROR`)
- **Ruling Readback After Second Attempt**: `verdict: COMPLIANT`, `canary_pass: true` (**Preserved Byte-for-Byte: true**)
- **Result**: **PASS**
