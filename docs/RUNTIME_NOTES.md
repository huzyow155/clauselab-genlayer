# Runtime Notes & Verification (Milestone 0)

## Overview
This document records the exact runtime characteristics of GenLayer Studio (`studionet`, chain ID `61999`, RPC `https://studio.genlayer.com/api`) probed live using `contracts/Probe.py`.

## Header and Imports Chosen
```python
# v0.2.16
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

import json
from genlayer import *
```

## Probed Behaviors & Findings

1. **Sender Address Accessor & String Formatting**:
   - `gl.message.sender_address` returns an `Address` instance.
   - String representation is obtained via `.as_hex` (e.g. `0xdB7D52A75f79e8be178e4E9F6D0c91F13fb64D9e`).

2. **Standard Library Imports**:
   - `import hashlib` succeeds inside methods and constructors.
   - SHA-256 digests compute deterministically (`hashlib_test`: `c323cf2b02e6`).

3. **User Error Class**:
   - `gl.vm.UserError` is present and raises user-facing transaction errors that correctly abort contract execution.

4. **Equivalence Principle (`gl.eq_principle.strict_eq`)**:
   - `gl.eq_principle.strict_eq(fn)` executes the no-arg function across all validators and requires identical string return values (`strict_eq_passed`: `true`).

5. **Non-deterministic Prompt Execution (`gl.nondet.exec_prompt`)**:
   - `gl.nondet.exec_prompt(prompt)` returns a string representation of the model's output (`nondet_type`: `"str"`, returned `"HELLO_STUDIONET"`).
   - Robust parsing requires stripping markdown code fences (````json` and ````) and parsing with `json.loads`.

6. **Latency**:
   - Consensus transaction duration: `23.07s`.

## On-Chain Verification Artifacts
- **Network**: GenLayer Studionet (Chain ID 61999)
- **Deployer**: `0xdB7D52A75f79e8be178e4E9F6D0c91F13fb64D9e`
- **Probe Contract Address**: `0xd4c24cc41dFEa72B7eB313D600Edf09FC9F5C8dc`
- **Deploy Tx Hash**: `0x7eec21cc49a8d604cf3c27079fe4acb7d6f6df630a674c94f4deea5587e96bfe`
- **Deploy Status**: `ACCEPTED`
- **Deploy Consensus Result**: `MAJORITY_AGREE`
- **Consensus Probe Tx Hash**: `0x5945279682933ec87d8c91c084caca320c684607e911b84c6f79770fa46109d9`
- **Consensus Status**: `ACCEPTED`
- **Consensus Result**: `MAJORITY_AGREE`
- **Measured Consensus Latency**: `23.07s`
- **Verified Read-Back JSON**:
```json
{
  "sender_address": "0xdB7D52A75f79e8be178e4E9F6D0c91F13fb64D9e",
  "sender_type": "Address",
  "hashlib_test": "c323cf2b02e6",
  "user_error_class": "gl.vm.UserError",
  "strict_eq_passed": true,
  "nondet_raw_output": "HELLO_STUDIONET",
  "nondet_type": "str"
}
```
