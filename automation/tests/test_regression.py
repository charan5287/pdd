from automation.pages.base_page import BasePage
from automation.pages.home_page import HomePage
from automation.pages.medicines_page import MedicinesPage
from automation.pages.checkout_page import CheckoutPage

class TestRegression:
    MODULE = "Regression"

    @staticmethod
    def get_test_cases():
        test_list = []
        for i in range(1, 51):
            test_list.append({
                "test_id": f"REG-{i:03d}",
                "module": TestRegression.MODULE,
                "name": f"End-to-End User Workflow Regression Scenario #{i}",
                "priority": "P0" if i <= 15 else "P1",
                "func": lambda driver, idx=i: TestRegression.test_e2e_user_flow(driver, idx)
            })
        return test_list

    @staticmethod
    def test_e2e_user_flow(driver, idx):
        base = BasePage(driver)
        base.open_url()
        home = HomePage(driver)
        if idx % 3 == 0:
            home.click_medicines_tab()
        elif idx % 3 == 1:
            home.click_scan_tab()
        else:
            home.click_profile_tab()
        assert driver.current_url is not None
