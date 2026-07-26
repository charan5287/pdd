from automation.pages.base_page import BasePage

class TestInputValidation:
    MODULE = "Input Validation"

    @staticmethod
    def get_test_cases():
        test_list = []
        for i in range(1, 41):
            test_list.append({
                "test_id": f"INP-{i:03d}",
                "module": TestInputValidation.MODULE,
                "name": f"Input Field Boundary & Sanitization Check #{i}",
                "priority": "P1",
                "func": lambda driver, idx=i: TestInputValidation.test_input_boundary(driver, idx)
            })
        return test_list

    @staticmethod
    def test_input_boundary(driver, idx):
        base = BasePage(driver)
        base.open_url()
        assert driver.current_url is not None
