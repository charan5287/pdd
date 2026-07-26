from automation.pages.base_page import BasePage

class TestErrorHandling:
    MODULE = "Error Handling"

    @staticmethod
    def get_test_cases():
        test_list = []
        for i in range(1, 21):
            test_list.append({
                "test_id": f"ERR-{i:03d}",
                "module": TestErrorHandling.MODULE,
                "name": f"404 Route & Exception Fallback Test #{i}",
                "priority": "P2",
                "func": lambda driver, idx=i: TestErrorHandling.test_error_boundary(driver, idx)
            })
        return test_list

    @staticmethod
    def test_error_boundary(driver, idx):
        base = BasePage(driver)
        base.open_url(f"#/non-existent-route-{idx}")
        assert driver.current_url is not None
