from selenium.webdriver.common.by import By
from automation.pages.base_page import BasePage

class ProfilePage(BasePage):
    USER_NAME_HEADING = (By.CSS_SELECTOR, "h2, h3, .profile-name")
    DARK_MODE_TOGGLE = (By.XPATH, "//button[contains(., 'Theme') or contains(., 'Dark') or contains(., 'Light')] | //input[@type='checkbox']")
    LOGOUT_BTN = (By.XPATH, "//button[contains(., 'Log Out') or contains(., 'Logout') or contains(., 'Sign Out')]")

    def toggle_dark_mode(self):
        return self.click(*self.DARK_MODE_TOGGLE)

    def logout(self):
        return self.click(*self.LOGOUT_BTN)
