import time
from automation.pages.base_page import BasePage

class TestPerformanceSmoke:
    MODULE = "Performance Smoke Tests"

    @staticmethod
    def get_test_cases():
        test_list = []
        for i in range(1, 21):
            test_list.append({
                "test_id": f"PERF-{i:03d}",
                "module": TestPerformanceSmoke.MODULE,
                "name": f"Page Load Latency & Resource Audit #{i}",
                "priority": "P1",
                "func": lambda driver, idx=i: TestPerformanceSmoke.test_page_speed(driver, idx)
            })
        return test_list

    @staticmethod
    def test_page_speed(driver, idx):
        start = time.time()
        base = BasePage(driver)
        base.open_url()
        elapsed = time.time() - start
        # Smoke performance check: page must respond within 15 seconds
        assert elapsed < 15.0, f"Page load took too long: {elapsed:.2f}s"
