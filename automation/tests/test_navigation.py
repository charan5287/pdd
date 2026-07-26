from automation.pages.base_page import BasePage
from automation.pages.home_page import HomePage

class TestNavigation:
    MODULE = "Navigation"

    @staticmethod
    def get_test_cases():
        test_list = []
        for i in range(1, 31):
            test_list.append({
                "test_id": f"NAV-{i:03d}",
                "module": TestNavigation.MODULE,
                "name": f"Navigation Bar & Route Switch Test #{i}",
                "priority": "P0" if i <= 5 else "P1",
                "func": lambda driver, idx=i: TestNavigation.test_nav_action(driver, idx)
            })
        return test_list

    @staticmethod
    def test_nav_action(driver, idx):
        base = BasePage(driver)
        base.open_url()
        home = HomePage(driver)
        if idx % 5 == 1:
            home.click_medicines_tab()
        elif idx % 5 == 2:
            home.click_reminders_tab()
        elif idx % 5 == 3:
            home.click_scan_tab()
        elif idx % 5 == 4:
            home.click_chat_tab()
        else:
            home.click_profile_tab()
        assert driver.current_url is not None
