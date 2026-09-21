# Prior Art Analysis

## Overview
Before finalizing ClauseLab, a comprehensive investigation of prior art across the GenLayer ecosystem and intelligent contract repositories was conducted.

### Survey Queries & Keywords
Searches were conducted across GitHub and the GenLayer ecosystem for:
- `"genlayer" "clause test scenarios"`
- `"genlayer" "agreement ambiguity"`
- `"genlayer" "canary calibration"`
- `"genlayer" "spec lock"`
- `hossein6191/pact1`
- `jason4185/invariantguard-intelligent-contract`
- Adjacent verification and proof contracts by `jason4185`

### Findings on Known Neighbors

1. **`hossein6191/pact1` (Plain-language pacts with AI jury and escrow)**
   - **Mechanism**: Two parties write natural language terms, both sign, and one deposits escrow. An obligated party files evidence pinned to a specific, immutable GitHub commit hash (`raw.githubusercontent.com/.../<commit-hash>/...`). A GenLayer validator jury settles the claim using strict equivalence on the file content/digest, and the verdict releases escrow directly to either the worker or refund to the funder.
   - **Distinction from ClauseLab**: `pact1` addresses dispute-time fact evaluation and escrow settlement based on external commit-pinned files. It does not test or surface ambiguity prior to signing. It has no scenario suites, no multi-party counter-scenario requirements, no spec locking gating on green scenario consensus, and no in-band canary calibration.

2. **`jason4185` Proof Contracts (`authorizationproof`, `consistencyproof`, `changeproof`, `debateproof`)**
   - **Mechanism**: Reusable Intelligent Contracts that verify specific semantic properties (such as whether an actor was authorized at a given timestamp, or whether two external sources are consistent) using bounded HTTP snapshots and validator consensus.
   - **Distinction from ClauseLab**: These contracts provide isolated semantic validation checks on external web artifacts. They do not provide an agreement lifecycle, adversarial counter-party scenario elicitation, or canary-calibrated agreement dispute settlement.

3. **General GenLayer Ecosystem**
   - In our review of public repositories and developer profiles, we found no contract that implements:
     - Scenario suite pre-signing ambiguity testing.
     - Ambiguity detection via validator consensus disagreement or `UNDECIDABLE` results.
     - Multi-party spec locking requiring green scenarios from all parties.
     - In-band canary calibration using held-back settled scenarios during dispute adjudication.

### Conclusion
Based on this search, we found no contract that combines pre-signing adversarial scenario elicitation from multiple parties, validator consensus classification as an ambiguity gate, spec locking gated on full scenario agreement, and dispute-time in-band canary calibration.
