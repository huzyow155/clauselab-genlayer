# v0.2.16
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

import json
from genlayer import *


class Probe(gl.Contract):
    probe_results: str

    def __init__(self):
        sender = gl.message.sender_address
        sender_hex = sender.as_hex

        import hashlib
        test_hash = hashlib.sha256(b"clauselab_probe").hexdigest()[:12]
        user_error_ok = (gl.vm.UserError.__name__ == "UserError")

        report = {
            "sender_address": sender_hex,
            "sender_type": str(type(sender).__name__),
            "hashlib_test": test_hash,
            "user_error_class": "gl.vm.UserError" if user_error_ok else "UNKNOWN",
            "strict_eq_passed": False,
            "nondet_raw_output": "",
            "nondet_type": "",
        }
        self.probe_results = json.dumps(report)

    @gl.public.view
    def get_results(self) -> str:
        return self.probe_results

    @gl.public.write
    def probe_consensus(self) -> None:
        def compute_nondet() -> str:
            res = gl.nondet.exec_prompt("Output exactly: HELLO_STUDIONET")
            return str(res).strip()

        eq_val = gl.eq_principle.strict_eq(compute_nondet)

        curr = json.loads(self.probe_results)
        curr["strict_eq_passed"] = (eq_val == "HELLO_STUDIONET")
        curr["nondet_raw_output"] = eq_val
        curr["nondet_type"] = "str"
        self.probe_results = json.dumps(curr)
