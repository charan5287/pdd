from selenium.webdriver.common.by import By
from automation.pages.base_page import BasePage

class SignUpPage(BasePage):
    NAME_INPUT = (By.CSS_SELECTOR, "input[name='name'], input[placeholder*='Name']")
    EMAIL_INPUT = (By.CSS_SELECTOR, "input[type='email'], input[name='email']")
    PASSWORD_INPUT = (By.CSS_SELECTOR, "input[type='password'], input[name='password']")
    CONFIRM_PASSWORD_INPUT = (By.CSS_SELECTOR, "input[name='confirmPassword'], input[placeholder*='Confirm']")
    SIGNUP_SUBMIT_BTN = (By.XPATH, "//button[@type='submit' or contains(., 'Sign Up') or contains(., 'Register')]")
    LOGIN_LINK = (By.XPATH, "//a[contains(text(), 'Sign In') or contains(text(), 'Login')]")

    def register_user(self, name: str, email: str, password: str):
        self.type_text(*self.NAME_INPUT, text=name)
        self.type_text(*self.EMAIL_INPUT, text=email)
        self.type_text(*self.PASSWORD_INPUT, text=password)
        if self.is_displayed(*self.CONFIRM_PASSWORD_INPUT, timeout=2):
            self.type_text(*self.CONFIRM_PASSWORD_INPUT, text=password)
        return self.click(*self.SIGNUP_SUBMIT_BTN)
