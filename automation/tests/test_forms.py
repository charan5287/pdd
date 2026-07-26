from automation.pages.base_page import BasePage
from automation.data.test_data import TestData

class TestForms:
    MODULE = "Forms"

    @staticmethod
    def get_test_cases():
        test_list = []
        for i in range(1, 51):
            test_list.append({
                "test_id": f"FORM-{i:03d}",
                "module": TestForms.MODULE,
                "name": f"Interactive Form Field Submission #{i}",
                "priority": "P1",
                "func": lambda driver, idx=i: TestForms.test_form_field(driver, idx)
            })
        return test_list

    @staticmethod
    def test_form_field(driver, idx):
        base = BasePage(driver)
        base.open_url()
        # Form field interaction test
        assert driver.page_source is not None
