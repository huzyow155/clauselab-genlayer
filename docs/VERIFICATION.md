# ClauseLab On-Chain Verification & Latency Report

## 1. Build & Source Verification
- **Network**: GenLayer Studionet
- **Chain ID**: `61999`
- **JSON-RPC Endpoint**: `https://studio.genlayer.com/api`
- **Block Explorer**: [https://explorer-studio.genlayer.com/address/0xf227D68595178A2192888c85E3550fEff4b79406](https://explorer-studio.genlayer.com/address/0xf227D68595178A2192888c85E3550fEff4b79406)
- **Contract Name**: `ClauseLab`
- **Final Contract Address**: `0xf227D68595178A2192888c85E3550fEff4b79406`
- **Deploy Transaction**: `0xf2d7bfa406a46cef66fa643a8eb3dae7f35e94efa0e622600a47c9cf494a89c2`
- **Consumer Contract Address**: `0x9Fe97e71A0eeF88594abDea901B978519C98df34`
- **Consumer Deploy Transaction**: `0x12adde0727804c01062fcb5be5c2b980afc70c1aa745cf2fb39f53a94a267406`
- **Source File**: `contracts/ClauseLab.py`
- **Source SHA-256**: `984ec7509168e04dcb615f44c198648d3594665f1f5daf7ee15bc128e83b9f10`
- **ASCII Scan**: Pure ASCII (`PASSED: 19624 bytes`)
- **GenVM Linter**: 0 errors, 0 warnings

### Superseded Deployments
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
  "result": 6,
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
