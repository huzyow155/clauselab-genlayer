# ClauseLab: Pre-Signing Contract Ambiguity Detection & Canary Calibration

ClauseLab is a standalone GenLayer Intelligent Contract that surfaces ambiguity in natural language agreements **before signing**. It holds no funds, implements no escrow, and interprets clauses against stipulated facts evaluated by validator consensus.

The dApp built on this contract, Agreement Studio, lives in a separate repository: https://github.com/huzyow155/agreement-studio-genlayer

- **Deployed Contract (GenLayer Studionet, Chain ID `61999`)**: [`0xf227D68595178A2192888c85E3550fEff4b79406`](https://explorer-studio.genlayer.com/address/0xf227D68595178A2192888c85E3550fEff4b79406)
- **Consumer Contract**: [`0x9Fe97e71A0eeF88594abDea901B978519C98df34`](https://explorer-studio.genlayer.com/address/0x9Fe97e71A0eeF88594abDea901B978519C98df34)
- **Network RPC**: `https://studio.genlayer.com/api`
- **Block Explorer**: [https://explorer-studio.genlayer.com/](https://explorer-studio.genlayer.com/)
- Full on-chain proof, transaction table, and raw receipts are documented in [docs/VERIFICATION.md](docs/VERIFICATION.md).
*(Earlier deployment address `0x9Ec4C9ad7B6fAb7490650F1A17D5b1129383a2F2` is superseded).*

---

## The Problem

Ambiguity in contractual agreements usually surfaces only after a dispute arises—when validators split, execution freezes, and counterparties find themselves in irreconcilable disagreement. Traditional smart contracts cannot interpret human language, while basic AI-adjudicated contracts either:
1. Allow uncalibrated, free-text LLM decisions where validator wording differences break consensus.
2. Rely on arbitrary prompt phrasing that fails when faced with edge cases unconsidered at drafting time.

## Why GenLayer

GenLayer enables **Intelligent Contracts** written in Python executed inside a sandboxed environment (`GenVM`). Through GenLayer's **Equivalence Principle** (`gl.eq_principle.strict_eq`), independent validator nodes independently query LLM models on non-deterministic tasks, parsing the output into deterministic canonical values that require multi-validator agreement before committing state changes.

---

## How ClauseLab Works

1. **Adversarial Scenario Elicitation**:
   - Parties create a draft spec (`create_spec`) with a clause and allowed outcome labels (e.g. `DELIVERED`, `BREACH`).
   - Every party must contribute hypothetical edge-case scenarios with their expected outcome (`add_scenario`).
2. **Pre-Signing Consensus Gate**:
   - Validators run each scenario (`run_scenario`). If consensus disagrees with the expected label or yields `UNDECIDABLE`, the scenario is marked **red**.
   - The spec can only be locked (`lock`) when:
     - At least 4 scenarios are present across at least 2 distinct expected labels.
     - Every party has proposed at least one scenario.
     - All parties have signed the current clause version.
     - All scenarios are green (consensus matches expected).
3. **Amendment Cycle**:
   - If a scenario is red, parties clarify the clause text via `amend()`, resetting signatures and re-evaluating until validators agree.
4. **Dispute Adjudication with In-Band Canary Calibration**:
   - At dispute time, parties stipulate (`stipulate_facts`) and confirm (`confirm_facts`) facts.
   - During `adjudicate`, locked scenarios serve two roles:
     - **Anchors**: Up to 3 settled examples are injected as few-shot exemplars.
     - **In-Band Canary**: One held-back settled scenario is evaluated alongside the disputed facts. If the validator model fails the known canary test, the verdict is flagged as `UNRELIABLE` (judge abstains) rather than rendering a confidently incorrect judgment. *(Note: UNRELIABLE ruling shown in mocks only; in the live studionet run, the validator model accurately passed the canary)*.

---

## Consensus Matrix: What Validators Compare & Why

| Operation | Non-Deterministic Block | What Validators Compare | Consensus Method | Rationale |
|---|---|---|---|---|
| `run_scenario` | Single LLM prompt classifying scenario against clause | Exact canonical label (e.g. `"DELIVERED"`, `"BREACH"`, or `"UNDECIDABLE"`) | `gl.eq_principle.strict_eq` | Free-text reasoning varies across model runs; strict equality on clean enums achieves validator consensus. |
| `adjudicate` | 1. Canary prompt on held-back scenario<br>2. Ruling prompt on disputed facts | Canonical string: `"VERDICT\|CANARY_PASS"` (e.g. `"DELIVERED\|1"` or `"UNRELIABLE\|0"`) | `gl.eq_principle.strict_eq` | Combines substantive ruling with canary pass flag in a single atomic comparison across all nodes. |

### Measured On-Chain Consensus Latency
- **Scenario Ambiguity Classification (`run_scenario`)**: typical ~12s (`11.85s` live on studionet)
- **Dispute Adjudication with Canary (`adjudicate`)**: typical ~28s (`28.47s` live on studionet)
- **Standard State Writes (`create_spec`, `amend`, `sign`, `lock`, `confirm`)**: ~2.8s – ~3.8s

---

## Public Contract API

### Write Methods
- `create_spec(title: str, clause: str, labels_csv: str) -> str`: Initiates draft spec.
- `invite(spec_id: str, party: str) -> None`: Author invites counterparty (max 4 parties).
- `add_scenario(spec_id: str, text: str, expected: str) -> int`: Proposes scenario.
- `run_scenario(spec_id: str, n: int) -> str`: Executes validator consensus on scenario.
- `amend(spec_id: str, new_clause: str) -> None`: Revises clause text; resets signatures and marks scenario runs stale.
- `sign(spec_id: str) -> None`: Signs current clause version.
- `lock(spec_id: str) -> str`: Validates preconditions and locks agreement, saving immutable `spec_hash`.
- `stipulate_facts(spec_id: str, text: str) -> str`: Submits dispute facts under locked spec.
- `confirm_facts(spec_id: str, facts_id: str) -> None`: Counterparty confirms facts (2 distinct parties required).
- `adjudicate(spec_id: str, facts_id: str) -> str`: Executes canary-calibrated consensus ruling.

### View Methods
- `get_spec(spec_id: str) -> str`: Returns spec JSON.
- `get_scenario(spec_id: str, n: int) -> str`: Returns scenario JSON.
- `suite_report(spec_id: str) -> str`: Returns status of all scenarios, red/green breakdown, and lock problems.
- `get_ruling(spec_id: str, facts_id: str) -> str`: Returns adjudication result and canary flag.
- `is_locked(spec_id: str) -> bool`: Returns lock status.
- `get_spec_hash(spec_id: str) -> str`: Returns locked spec content digest.
- `get_specs_by_party(party: str, limit: int = 20) -> str`: Discovery view listing party specs.
- `get_latest_spec(party: str) -> str`: Discovery view returning latest author spec ID.
- `get_facts(spec_id: str, facts_id: str) -> str`: Returns facts record.
- `get_latest_facts_id(spec_id: str) -> str`: Returns latest facts ID for spec.

---

## Deployment & Verification on Studionet

### Prerequisites
- Node.js >= 18
- Python >= 3.10
- Dependencies: `npm install` (`genlayer-js@^1.1.8`)

### Running Verification Tests Locally
```powershell
python -m unittest discover tests -v
```

### ASCII Compliance Scan
```powershell
python scripts/scan_ascii.py contracts/ClauseLab.py
```

### Deploying to GenLayer Studionet
```powershell
node scripts/deploy/run_live_evidence.js
```
Full transaction receipts and leader execution results are detailed in [docs/VERIFICATION.md](docs/VERIFICATION.md).



## Integration Example (Consumer Contract)

External contracts can safely consume ClauseLab rulings and escalate on `UNRELIABLE`:

```python
# v0.2.16
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

import json
from genlayer import *

class ClauseLabConsumer(gl.Contract):
    clauselab_address: Address
    disputes_settled: TreeMap[str, str]

    def __init__(self, clauselab_address_str: str):
        self.clauselab_address = Address(clauselab_address_str)

    @gl.public.write
    def settle_from_ruling(self, spec_id: str, facts_id: str) -> str:
        clauselab = gl.get_contract_at(self.clauselab_address)
        ruling_json = clauselab.view().get_ruling(spec_id, facts_id)
        data = json.loads(ruling_json)

        verdict = str(data.get("verdict", "")).upper()
        canary_pass = bool(data.get("canary_pass", False))

        if verdict == "UNRELIABLE" or not canary_pass:
            raise gl.vm.UserError("Adjudication escalated to human arbitrator: canary failed")

        self.disputes_settled[spec_id + ":" + facts_id] = verdict
        return verdict
```

---

## Known Limitations

1. **Canary as a Signal, Not a Proof**: Passing the held-back canary scenario validates that the model remains calibrated on known edge cases, but cannot mathematically prove accuracy on novel dispute patterns.
2. **Anchor Bias & Agreement Measurement**: While anchors provide few-shot exemplars, we have not measured whether they increase validator agreement in production, and they can bias the judge if examples disproportionately lean toward one outcome.
3. **No External Truth Oracle**: ClauseLab adjudicates stipulated facts agreed upon by the parties; it does not independently poll third-party APIs to verify physical events.
4. **UNRELIABLE Ruling Occurrence**: An `UNRELIABLE` ruling was shown in mocks only (unit test `test_biased_judge_always_favoring_contractor_is_flagged`). In our live studionet deployment, the validator model accurately judged both the canary and the disputed facts, yielding `DELIVERED` with `canary_pass: true`.

---

## Future Roadmap

A companion frontend application ("Agreement Studio") is maintained in [https://github.com/huzyow155/agreement-studio-genlayer](https://github.com/huzyow155/agreement-studio-genlayer).
Additional planned contract extensions:
- Interactive countersuit and adversary scenario generator.
- Dedicated escrow contracts programmatically bound to the locked `spec_hash`.

---

## License

MIT License. Copyright (c) 2026 huzyow155.
