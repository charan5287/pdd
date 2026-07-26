from selenium.webdriver.common.by import By
from automation.pages.base_page import BasePage

class EmergencyPage(BasePage):
    CALL_108_BTN = (By.XPATH, "//a[contains(@href, 'tel:108')] | //button[contains(., '108')]")
    CALL_102_BTN = (By.XPATH, "//a[contains(@href, 'tel:102')] | //button[contains(., '102')]")
    HOSPITALS_LIST = (By.CSS_SELECTOR, ".hospital-item, .card, [data-testid='hospital']")

    def is_emergency_page_active(self) -> bool:
        return self.is_displayed(*self.CALL_108_BTN)
