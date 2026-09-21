# ClauseLab On-Chain Verification & Latency Report

## 1. Build & Source Verification
- **Network**: GenLayer Studionet
- **Chain ID**: `61999`
- **JSON-RPC Endpoint**: `https://studio.genlayer.com/api`
- **Block Explorer**: [https://explorer-studio.genlayer.com/address/0xf227D68595178A2192888c85E3550fEff4b79406](https://explorer-studio.genlayer.com/address/0xf227D68595178A2192888c85E3550fEff4b79406)
- **Contract Name**: `ClauseLab`
- **Contract Address**: `0xf227D68595178A2192888c85E3550fEff4b79406`
- **Deploy Transaction**: `0xf2d7bfa406a46cef66fa643a8eb3dae7f35e94efa0e622600a47c9cf494a89c2`
- **Consumer Contract Address**: `0x9Fe97e71A0eeF88594abDea901B978519C98df34`
- **Consumer Deploy Transaction**: `0x12adde0727804c01062fcb5be5c2b980afc70c1aa745cf2fb39f53a94a267406`
- **Source File**: `contracts/ClauseLab.py`
- **Source SHA-256**: `984ec7509168e04dcb615f44c198648d3594665f1f5daf7ee15bc128e83b9f10`
- **ASCII Scan**: Pure ASCII (`PASSED: 19624 bytes`)
- **GenVM Linter**: 0 errors, 0 warnings

---

## 2. Test Suite Execution
Local tests executed with `python -m unittest discover tests -v`:
- **Layer 1 (Pure Unit Tests)**: 8 passed (label parsing, anchor determinism, canary disjointness, lock problems reporting, spec hash mutation).
- **Layer 2 (Mocked LLM Tests)**: 8 passed (mismatching scenario blocks lock, UNDECIDABLE scenario red, malformed JSON handling, canary failure yields UNRELIABLE star test, prompt injection containment, amendment invalidation, lock gating, fact confirmation by 2 distinct parties).
- **Layer 3 (Consensus Simulation Tests)**: 4 passed (strict_eq agreement, split validator disagreement, canary disagreement, undecidable scenario consensus).
- **Biased Judge Test**: 1 passed (biased judge unconditionally favoring contractor is flagged via canary calibration).
- **Total Local Unit Tests**: 21 passed (0 failures, 0 errors).

---

## 3. Live On-Chain Milestone 4 Results (Studionet)

### Test Parties
- **Party A (Author / Proposer)**: `0x8D99B01692b2c16A5Cda7c30e1aAeeDC69eE5031`
- **Party B (Counterparty)**: `0x109C3A6f0CC9F467F93FfBa5Afb736208b5DD4B2`

### Live Transaction Log
1. **Contract Deployment**:
   - Tx: `0xf2d7bfa406a46cef66fa643a8eb3dae7f35e94efa0e622600a47c9cf494a89c2`
   - Status: `ACCEPTED`, Result: `MAJORITY_AGREE`
2. **Create Spec (Vague Clause)**:
   - Clause: `"The contractor shall deliver a satisfactory software package promptly."`
   - Tx: `0xadc9217a1ed9cbdbf8782928714767cf795e10676e80f10b14d28247f7c768a9`
   - Spec ID: `20f3293644c0`
3. **Invite Party B**:
   - Tx: `0xffc2a74a153b1c9acfc9a6b452d3a1f5e00bec79b113cd8a1fc484be2cf01cec`
4. **Add 4 Counter-Scenarios**:
   - Scenario 1 (Party A): `0x1d94c960aa1397a35db8a43100afc9dde0f3121c599302244406465528e83fd6` (expected: `BREACH`)
   - Scenario 2 (Party A): `0x520eb597dd0326a140bee1184aeed637f5bba425b1e314a041b083a1b6aa6677` (expected: `DELIVERED`)
   - Scenario 3 (Party B): `0x4da64ff4e68cc49d8f59e69ee93b58ee58a5fa8c75842e09f05f673d756f4f29` (boundary prompt case; expected: `DELIVERED`)
   - Scenario 4 (Party B): `0x1ff60add1896cfbe9aea2fbf82fbe4be266801bd4ffc5bf1cff8ade90ef6cf8c` (expected: `BREACH`)
5. **Ambiguity Surfacing (Scenario 3 turns RED)**:
   - Tx: `0x87b6b38363ddbe9b9bbfa9ba4d9d06ce6811ae391814752e5b3bad5b7c1ad4ee`
   - Latency: `11.85s`
   - Consensus classified as `UNDECIDABLE` under vague "promptly" clause.
   - Result: `matches: false` (Scenario 3 is RED).
   - `suite_report` read-back: `{"red_scenarios": [3], "ready_to_lock": false, "lock_problems": ["scenario 3 is red", ...]}`
   - Attempted `lock()`: Reverts / fails as expected. `is_locked`: `false`.
6. **Amend Clause (Clarification)**:
   - Revised Clause: `"The contractor shall deliver the repository with pure ASCII code and passing tests within 7 calendar days of contract creation."`
   - Tx: `0xd923fd2858ebd1a78ab6f1272d29bbd92a74698b6690fe214e413fa48403ee3c`
   - Version incremented to 2, prior signatures cleared.
7. **Re-Run Scenarios on Version 2 (All GREEN)**:
   - All 4 scenarios re-evaluated by validator consensus under version 2.
   - Scenario 3 (delivery on day 4) now clearly satisfies the 7-day requirement -> classified as `DELIVERED` (`matches: true`).
   - `suite_report` read-back: `{"green_scenarios": [1, 2, 3, 4], "red_scenarios": [], "ready_to_lock": false, "lock_problems": ["party has not signed..."]}`
8. **Dual Sign & Lock**:
   - Sign Party A: `0xefb7ece24408c65438020e44a001a92d9677e28a5388d28b1f555137e3ae1a2b`
   - Sign Party B: `0xf6cab561688adca628951f09601743eed2ff4a14a58a0f1134f80cef6b230b2a`
   - Lock Tx: `0xcd8e5a1c69606b96df7405ed7a3ec5a9c74bf45e05fa42febe0ab26c83f610d1`
   - Lock Status: `ACCEPTED`, Result: `MAJORITY_AGREE`
   - `is_locked`: `true`
   - `spec_hash`: `ca1a92e7a869960991fd9be2c797b3a8c21b6dfe0a11d7e4292bdad1bcd5571c`
9. **Stipulate & Confirm Dispute Facts**:
   - Facts: `"The contractor pushed the repository with pure ASCII code and passing tests on calendar day 3, well within the 7-day requirement."`
   - `stipulate_facts` Tx (Party A): `0x7071f83194855f551f47a4375da4cfce8a6252b3b16bc8ed664a488742d7042f`
   - Facts ID: `f1830b46947f`
   - `confirm_facts` Tx (Party B): `0xc1e62bd037bc5cadb44134496a422c251d081cfdf9842f03ff7e92be93d17886`
   - Facts confirmation verified: `len(set(by)) == 2`.
10. **Consensus Adjudication (Canary Calibration + Substantive Ruling)**:
    - `adjudicate` Tx: `0x567fc073a4f0aa45c262b28705122d0537f70f51b0fea2032ebbb421742ce72d`
    - Latency: `28.47s` (2 LLM calls per validator: canary validation + facts ruling)
    - Status: `ACCEPTED`, Result: `MAJORITY_AGREE`
    - Verified Read-Back:
      ```json
      {
        "canary_pass": true,
        "facts_id": "f1830b46947f",
        "schema_version": "1.0",
        "spec_hash": "ca1a92e7a869960991fd9be2c797b3a8c21b6dfe0a11d7e4292bdad1bcd5571c",
        "spec_id": "20f3293644c0",
        "verdict": "DELIVERED"
      }
      ```
11. **Cross-Contract Consumer Settlement**:
    - Deploy Consumer Tx: `0x12adde0727804c01062fcb5be5c2b980afc70c1aa745cf2fb39f53a94a267406`
    - Consumer Address: `0x9Fe97e71A0eeF88594abDea901B978519C98df34`
    - Consumer `settle_from_ruling` Tx: `0xec2882dec8951367d93de014a8a2f367db1e4c625d8c5e62a1fe6ea83dcee927`
    - Settled Verdict Read-Back: `DELIVERED`

---

## 4. Measured Latency Breakdown
- **Single LLM Consensus Write (`run_scenario`)**: `11.85s`
- **Dual LLM Consensus Write (`adjudicate` with canary calibration)**: `28.47s`
- **Standard State Writes (`create_spec`, `amend`, `sign`, `lock`, `confirm`)**: `2.8s - 3.8s`
