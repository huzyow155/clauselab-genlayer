import unittest
from tests.helpers_for_test import (
    _parse_labels, _anchor_ids, _canary_id, _spec_hash, _lock_problems,
    _clean_label, _ruling_string, _prompt, RESERVED, LABEL_CHARS
)

class TestLayer1Pure(unittest.TestCase):
    def test_parse_labels_valid(self):
        labels = _parse_labels("ACCEPTED, REJECTED")
        self.assertEqual(labels, ["ACCEPTED", "REJECTED"])

        labels3 = _parse_labels("PAY, REFUND, SPLIT")
        self.assertEqual(labels3, ["PAY", "REFUND", "SPLIT"])

        labels5 = _parse_labels("A, B, C, D, E")
        self.assertEqual(len(labels5), 5)

    def test_parse_labels_rejects_duplicates(self):
        with self.assertRaises(ValueError):
            _parse_labels("YES, NO, YES")

    def test_parse_labels_rejects_reserved(self):
        for res in RESERVED:
            with self.assertRaises(ValueError):
                _parse_labels(f"VALID, {res}")

    def test_parse_labels_rejects_bad_labels(self):
        # Empty label
        with self.assertRaises(ValueError):
            _parse_labels("YES, ")
        # Lowercase or special chars outside A-Z0-9_ (lowercase gets uppercased, but spaces/punctuation fail)
        with self.assertRaises(ValueError):
            _parse_labels("YES, NO!")
        # Too long (>24 chars)
        with self.assertRaises(ValueError):
            _parse_labels("YES, " + "A" * 25)
        # Fewer than 2 labels
        with self.assertRaises(ValueError):
            _parse_labels("ONLY_ONE")
        # More than 5 labels
        with self.assertRaises(ValueError):
            _parse_labels("A, B, C, D, E, F")

    def test_anchor_and_canary_deterministic_and_disjoint(self):
        scenarios = [
            {"n": 1, "text": "delivered on time", "expected": "PASS"},
            {"n": 2, "text": "never delivered", "expected": "FAIL"},
            {"n": 3, "text": "delivered late with penalty", "expected": "PARTIAL"},
            {"n": 4, "text": "delivered next day", "expected": "PASS"},
            {"n": 5, "text": "wrong item delivered", "expected": "FAIL"},
        ]
        spec_h = "0123456789abcdef"
        facts_h = "fedcba9876543210"

        anchors1 = _anchor_ids(scenarios)
        anchors2 = _anchor_ids(scenarios)
        self.assertEqual(anchors1, anchors2, "Anchors must be deterministic")
        self.assertTrue(len(anchors1) <= 3)

        canary1 = _canary_id(spec_h, facts_h, scenarios)
        canary2 = _canary_id(spec_h, facts_h, scenarios)
        self.assertEqual(canary1, canary2, "Canary must be deterministic")

        # Disjointness: canary must NOT be in anchors
        self.assertNotIn(canary1, anchors1, "Canary must be disjoint from anchors")

    def test_canary_none_when_no_candidates(self):
        # If all scenarios are taken as anchors (e.g. only 3 scenarios with 3 distinct labels)
        scenarios = [
            {"n": 1, "text": "s1", "expected": "A"},
            {"n": 2, "text": "s2", "expected": "B"},
            {"n": 3, "text": "s3", "expected": "C"},
        ]
        canary = _canary_id("sh", "fh", scenarios)
        self.assertIsNone(canary)

    def test_lock_problems_reports_each_missing_condition(self):
        party_a = "0x1111111111111111111111111111111111111111"
        party_b = "0x2222222222222222222222222222222222222222"

        # 1. Spec not draft
        spec = {
            "version": 1,
            "status": "LOCKED",
            "parties": [party_a],
            "signed": [party_a],
        }
        scenarios = []
        p = _lock_problems(spec, scenarios)
        self.assertIn("spec is not a draft", p)

        # 2. Fewer than 4 scenarios
        spec["status"] = "DRAFT"
        p = _lock_problems(spec, scenarios)
        self.assertIn("need at least 4 scenarios", p)

        # 3. Only 1 distinct expected label
        scenarios = [
            {"n": 1, "expected": "PASS", "proposer": party_a, "ran_version": 1, "matches": True},
            {"n": 2, "expected": "PASS", "proposer": party_a, "ran_version": 1, "matches": True},
            {"n": 3, "expected": "PASS", "proposer": party_a, "ran_version": 1, "matches": True},
            {"n": 4, "expected": "PASS", "proposer": party_a, "ran_version": 1, "matches": True},
        ]
        p = _lock_problems(spec, scenarios)
        self.assertIn("need at least 2 distinct expected labels", p)

        # 4. Party has proposed no scenario
        spec["parties"] = [party_a, party_b]
        scenarios[1]["expected"] = "FAIL"
        p = _lock_problems(spec, scenarios)
        self.assertIn("party has proposed no scenario: " + party_b, p)

        # 5. Party has not signed
        scenarios[3]["proposer"] = party_b
        p = _lock_problems(spec, scenarios)
        self.assertIn("party has not signed: " + party_b, p)

        # 6. Scenario not run at current version (stale)
        spec["signed"] = [party_a, party_b]
        scenarios[0]["ran_version"] = 0
        p = _lock_problems(spec, scenarios)
        self.assertIn("scenario 1 not run at current version", p)

        # 7. Scenario is red (does not match)
        scenarios[0]["ran_version"] = 1
        scenarios[0]["matches"] = False
        p = _lock_problems(spec, scenarios)
        self.assertIn("scenario 1 is red", p)

        # When all fixed -> empty problems list
        scenarios[0]["matches"] = True
        p = _lock_problems(spec, scenarios)
        self.assertEqual(p, [])

    def test_spec_hash_changes_on_clause_or_scenario_mutation(self):
        clause = "Goods must be delivered within 3 business days."
        labels = ["DELIVERED", "BREACH"]
        scenarios = [
            {"n": 1, "text": "Delivered on day 2", "expected": "DELIVERED"},
            {"n": 2, "text": "Delivered on day 5", "expected": "BREACH"},
            {"n": 3, "text": "Never delivered", "expected": "BREACH"},
            {"n": 4, "text": "Delivered on day 1", "expected": "DELIVERED"},
        ]

        base_hash = _spec_hash(clause, labels, scenarios)
        self.assertEqual(len(base_hash), 64)

        # Mutate clause
        diff_clause_hash = _spec_hash(clause + " Except holidays.", labels, scenarios)
        self.assertNotEqual(base_hash, diff_clause_hash)

        # Mutate scenario text
        mutated_sc = [dict(s) for s in scenarios]
        mutated_sc[0]["text"] = "Delivered on day 3"
        diff_sc_hash = _spec_hash(clause, labels, mutated_sc)
        self.assertNotEqual(base_hash, diff_sc_hash)

        # Mutate scenario expected
        mutated_sc2 = [dict(s) for s in scenarios]
        mutated_sc2[0]["expected"] = "BREACH"
        diff_exp_hash = _spec_hash(clause, labels, mutated_sc2)
        self.assertNotEqual(base_hash, diff_exp_hash)

if __name__ == '__main__':
    unittest.main()
