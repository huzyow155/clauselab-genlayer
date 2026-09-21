import unittest
from tests.helpers_for_test import _clean_label, _scenario_core, _ruling_string

def simulate_strict_eq(validator_runs):
    """
    Simulates GenLayer's gl.eq_principle.strict_eq across independent validator nodes.
    Each validator node executes the function independently.
    strict_eq requires that the leader and validators return byte-identical results.
    """
    results = [fn() for fn in validator_runs]
    # Check if all returned results match the leader (first result)
    leader_result = results[0]
    all_agree = all(r == leader_result for r in results)
    return {
        "agreed": all_agree,
        "consensus_value": leader_result if all_agree else None,
        "results": results
    }

class TestLayer3Consensus(unittest.TestCase):
    def test_identical_labels_agree_in_strict_eq(self):
        # 3 validators all rule DELIVERED
        v1 = lambda: _clean_label({"label": "DELIVERED"}, ["DELIVERED", "BREACH"])
        v2 = lambda: _clean_label({"label": "DELIVERED"}, ["DELIVERED", "BREACH"])
        v3 = lambda: _clean_label({"label": "DELIVERED"}, ["DELIVERED", "BREACH"])

        outcome = simulate_strict_eq([v1, v2, v3])
        self.assertTrue(outcome["agreed"])
        self.assertEqual(outcome["consensus_value"], "DELIVERED")

    def test_diverging_validator_labels_do_not_agree(self):
        # Validator 1 rules DELIVERED, Validator 2 rules BREACH (split jury)
        v1 = lambda: _clean_label({"label": "DELIVERED"}, ["DELIVERED", "BREACH"])
        v2 = lambda: _clean_label({"label": "BREACH"}, ["DELIVERED", "BREACH"])
        v3 = lambda: _clean_label({"label": "DELIVERED"}, ["DELIVERED", "BREACH"])

        outcome = simulate_strict_eq([v1, v2, v3])
        self.assertFalse(outcome["agreed"])
        self.assertIsNone(outcome["consensus_value"])

    def test_adjudicate_canary_disagreement(self):
        # If one validator has canary pass and another fails canary, ruling strings differ
        # (e.g. "DELIVERED|1" vs "UNRELIABLE|0")
        v1_ruling = lambda: _ruling_string("DELIVERED", True)
        v2_ruling = lambda: _ruling_string("DELIVERED", False)

        outcome = simulate_strict_eq([v1_ruling, v2_ruling])
        self.assertFalse(outcome["agreed"])
        self.assertNotEqual(outcome["results"][0], outcome["results"][1])

    def test_undecidable_scenario_consensus(self):
        # If clause is inherently vague, all validators return UNDECIDABLE -> consensus reaches UNDECIDABLE
        v1 = lambda: _clean_label({"label": "UNKNOWN"}, ["DELIVERED", "BREACH"])
        v2 = lambda: _clean_label({"label": "SOMETHING_ELSE"}, ["DELIVERED", "BREACH"])

        outcome = simulate_strict_eq([v1, v2])
        self.assertTrue(outcome["agreed"])
        self.assertEqual(outcome["consensus_value"], "UNDECIDABLE")

if __name__ == '__main__':
    unittest.main()
