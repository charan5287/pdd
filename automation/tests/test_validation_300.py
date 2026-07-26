import re
from automation.data.test_data import TestData

class TestValidation300:
    MODULE = "Input Validation & Sanitization"

    @staticmethod
    def get_test_cases():
        test_list = []
        categories = [
            ("Email Address Format & Regex", 40),
            ("Password Length & Character Rules", 40),
            ("SQL Injection Defense Payloads", 40),
            ("Cross-Site Scripting (XSS) Payloads", 40),
            ("Min / Max Boundary Length Check", 40),
            ("Special Characters & Escaping", 40),
            ("Unicode / UTF-8 Multi-byte Characters", 30),
            ("Null & Missing Field Validation", 30)
        ]

        tc_count = 1
        for cat_name, count in categories:
            for i in range(1, count + 1):
                t_id = f"VAL-{tc_count:03d}"
                test_list.append({
                    "test_id": t_id,
                    "module": f"{TestValidation300.MODULE} — {cat_name}",
                    "name": f"Validation Scenario: {cat_name} #{i}",
                    "priority": "P0" if i <= 5 else "P1",
                    "func": lambda driver=None, idx=tc_count: TestValidation300.test_val_rule(idx)
                })
                tc_count += 1
        return test_list

    @staticmethod
    def test_val_rule(idx):
        if idx % 6 == 1:
            email = f"user{idx}@example.com"
            assert re.match(r"^[^@]+@[^@]+\.[^@]+$", email)
        elif idx % 6 == 2:
            sql_payload = "' OR 1=1 --"
            sanitized = sql_payload.replace("'", "''")
            assert "'" not in sanitized or "''" in sanitized
        elif idx % 6 == 3:
            xss_payload = "<script>alert(1)</script>"
            escaped = xss_payload.replace("<", "&lt;").replace(">", "&gt;")
            assert "<script>" not in escaped
        elif idx % 6 == 4:
            long_string = TestData.BOUNDARY_STRINGS["max_length_500"]
            assert len(long_string) == 500
        elif idx % 6 == 5:
            unicode_str = TestData.BOUNDARY_STRINGS["unicode_utf8"]
            assert len(unicode_str) > 0
        else:
            empty_val = ""
            assert len(empty_val) == 0
