import unittest
import json
from tests.helpers_for_test import (
    _parse_labels, _clean_label, _prompt, _adjudicate_core, _ruling_string
)
from tests.test_layer2_mocked import ClauseLabSim

class TestBiasedJudgeFlagged(unittest.TestCase):
    def setUp(self):
        self.party_a = "0x1111111111111111111111111111111111111111"
        self.party_b = "0x2222222222222222222222222222222222222222"

    def test_biased_judge_always_favoring_contractor_is_flagged(self):
        """
        A compromised or biased judge model that unconditionally rules DELIVERED
        regardless of facts must fail the canary test when the held-back canary scenario
        is a known BREACH case. The ruling must result in UNRELIABLE.
        """
        # Biased LLM that unconditionally returns DELIVERED to favor the contractor
        def biased_contractor_llm(p):
            return {"label": "DELIVERED"}

        # Balanced LLM used during pre-signing to lock the agreement
        def balanced_llm(p):
            case = p.split("<UNTRUSTED_CASE>")[1].split("</UNTRUSTED_CASE>")[0].lower()
            if "breach" in case or "disappear" in case or "after deadline" in case:
                return {"label": "BREACH"}
            return {"label": "DELIVERED"}

        sim = ClauseLabSim(balanced_llm)
        sim.set_sender(self.party_a)
        sid = sim.create_spec("Delivery", "Must deliver within 7 days", "DELIVERED, BREACH")
        sim.invite(sid, self.party_b)

        # Scenarios:
        # Scenario 1 (DELIVERED) and 2 (BREACH) will be selected as anchors (indices 1, 2)
        # Scenarios 3 (BREACH) and 4 (BREACH) form the canary candidate set
        sim.set_sender(self.party_a)
        sim.add_scenario(sid, "Delivered on day 3 with passing tests (delivered)", "DELIVERED")
        sim.add_scenario(sid, "Delivered on day 20 after deadline (breach)", "BREACH")

        sim.set_sender(self.party_b)
        sim.add_scenario(sid, "Defective product with corrupted bytes (breach)", "BREACH")
        sim.add_scenario(sid, "Contractor disappeared and delivered nothing (breach)", "BREACH")

        # All scenarios pass pre-signing check with balanced LLM
        for i in range(1, 5):
            sim.run_scenario(sid, i)

        sim.set_sender(self.party_a)
        sim.sign(sid)
        sim.set_sender(self.party_b)
        sim.sign(sid)
        sim.lock(sid)

        # Stipulate facts
        sim.set_sender(self.party_a)
        fid = sim.stipulate_facts(sid, "Contractor delivered on day 4.")
        sim.set_sender(self.party_b)
        sim.confirm_facts(sid, fid)

        # At adjudication time, suppose a biased judge model is substituted
        sim.mock_llm_fn = biased_contractor_llm
        ruling = sim.adjudicate(sid, fid)

        # The canary scenario was a known BREACH case, but the biased judge ruled DELIVERED
        # The in-band canary failed, forcing the ruling to UNRELIABLE
        self.assertEqual(ruling, "UNRELIABLE|0")
        ruling_rec = json.loads(sim.rulings[f"{sid}:{fid}"])
        self.assertEqual(ruling_rec["verdict"], "UNRELIABLE")
        self.assertFalse(ruling_rec["canary_pass"])

if __name__ == '__main__':
    unittest.main()
