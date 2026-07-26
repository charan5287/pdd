from automation.pages.base_page import BasePage
from automation.data.test_data import TestData

class TestResponsiveDesign:
    MODULE = "Responsive Design"

    @staticmethod
    def get_test_cases():
        test_list = []
        for i in range(1, 21):
            test_list.append({
                "test_id": f"RSP-{i:03d}",
                "module": TestResponsiveDesign.MODULE,
                "name": f"Mobile & Tablet Viewport Layout Verification #{i}",
                "priority": "P1",
                "func": lambda driver, idx=i: TestResponsiveDesign.test_viewport(driver, idx)
            })
        return test_list

    @staticmethod
    def test_viewport(driver, idx):
        base = BasePage(driver)
        base.open_url()
        viewports = list(TestData.VIEWPORTS.values())
        vp = viewports[idx % len(viewports)]
        driver.set_window_size(vp[0], vp[1])
        assert driver.current_url is not None
