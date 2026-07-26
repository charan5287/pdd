from selenium.webdriver.common.by import By
from automation.pages.base_page import BasePage

class HomePage(BasePage):
    HERO_HEADER = (By.XPATH, "//h1 | //h2 | //*[contains(text(), 'Welcome') or contains(text(), 'MediNow')]")
    SEARCH_INPUT = (By.CSS_SELECTOR, "input[placeholder*='Search'], input[type='search']")
    BOTTOM_NAV_HOME = (By.XPATH, "//button[contains(., 'Home')] | //a[contains(@href, 'home')]")
    BOTTOM_NAV_MEDICINES = (By.XPATH, "//button[contains(., 'Medicines')] | //a[contains(@href, 'medicines')]")
    BOTTOM_NAV_REMINDERS = (By.XPATH, "//button[contains(., 'Reminders')] | //a[contains(@href, 'reminders')]")
    BOTTOM_NAV_SCAN = (By.XPATH, "//button[contains(., 'Scan')] | //a[contains(@href, 'scan')]")
    BOTTOM_NAV_CHAT = (By.XPATH, "//button[contains(., 'Chat')] | //a[contains(@href, 'chat')]")
    BOTTOM_NAV_PROFILE = (By.XPATH, "//button[contains(., 'Profile')] | //a[contains(@href, 'profile')]")
    CART_ICON_BTN = (By.XPATH, "//button[contains(@aria-label, 'Cart') or contains(., 'Cart')] | //a[contains(@href, 'checkout')]")

    def is_dashboard_loaded(self) -> bool:
        return self.is_displayed(*self.HERO_HEADER)

    def search_item(self, query: str):
        return self.type_text(*self.SEARCH_INPUT, text=query)

    def click_medicines_tab(self):
        return self.click(*self.BOTTOM_NAV_MEDICINES)

    def click_reminders_tab(self):
        return self.click(*self.BOTTOM_NAV_REMINDERS)

    def click_scan_tab(self):
        return self.click(*self.BOTTOM_NAV_SCAN)

    def click_chat_tab(self):
        return self.click(*self.BOTTOM_NAV_CHAT)

    def click_profile_tab(self):
        return self.click(*self.BOTTOM_NAV_PROFILE)

    def open_cart(self):
        return self.click(*self.CART_ICON_BTN)
