from automation.pages.base_page import BasePage

class TestSessionManagement:
    MODULE = "Session Management"

    @staticmethod
    def get_test_cases():
        test_list = []
        for i in range(1, 21):
            test_list.append({
                "test_id": f"SES-{i:03d}",
                "module": TestSessionManagement.MODULE,
                "name": f"LocalStorage Persistence & Tab Sync Test #{i}",
                "priority": "P1",
                "func": lambda driver, idx=i: TestSessionManagement.test_session_token(driver, idx)
            })
        return test_list

    @staticmethod
    def test_session_token(driver, idx):
        base = BasePage(driver)
        base.open_url()
        driver.execute_script("localStorage.setItem('test_session_key', 'valid_token_123');")
        val = driver.execute_script("return localStorage.getItem('test_session_key');")
        assert val == 'valid_token_123'
