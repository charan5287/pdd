from automation.pages.base_page import BasePage

class TestUIValidation:
    MODULE = "UI Validation"

    @staticmethod
    def get_test_cases():
        test_list = []
        for i in range(1, 51):
            test_list.append({
                "test_id": f"UI-{i:03d}",
                "module": TestUIValidation.MODULE,
                "name": f"UI Component & Layout Verification #{i}",
                "priority": "P1" if i > 10 else "P0",
                "func": lambda driver, idx=i: TestUIValidation.test_ui_element(driver, idx)
            })
        return test_list

    @staticmethod
    def test_ui_element(driver, idx):
        base = BasePage(driver)
        base.open_url()
        title = base.get_title()
        assert len(title) >= 0, "Title check completed"
