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
        ruling_json_str = clauselab.view().get_ruling(spec_id, facts_id)
        if not ruling_json_str or ruling_json_str == "{}":
            raise gl.vm.UserError("no ruling found on ClauseLab")

        data = json.loads(ruling_json_str)
        verdict = str(data.get("verdict", "")).upper()
        canary_pass = bool(data.get("canary_pass", False))

        if verdict == "UNRELIABLE" or not canary_pass:
            raise gl.vm.UserError("adjudication escalated to human arbitrator: ruling marked UNRELIABLE")

        if verdict not in ("DELIVERED", "BREACH"):
            raise gl.vm.UserError("unsupported verdict: " + verdict)

        key = spec_id + ":" + facts_id
        self.disputes_settled[key] = verdict
        return verdict

    @gl.public.view
    def get_settled_dispute(self, spec_id: str, facts_id: str) -> str:
        return self.disputes_settled.get(spec_id + ":" + facts_id, "")
