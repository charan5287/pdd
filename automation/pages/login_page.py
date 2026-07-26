from selenium.webdriver.common.by import By
from automation.pages.base_page import BasePage

class LoginPage(BasePage):
    # Locators
    EMAIL_INPUT = (By.CSS_SELECTOR, "input[type='email'], input[name='email'], input[placeholder*='Email']")
    PASSWORD_INPUT = (By.CSS_SELECTOR, "input[type='password'], input[name='password'], input[placeholder*='Password']")
    LOGIN_SUBMIT_BTN = (By.XPATH, "//button[@type='submit' or contains(., 'Sign In') or contains(., 'Login')]")
    SIGNUP_LINK = (By.XPATH, "//a[contains(text(), 'Sign Up') or contains(text(), 'Create account')] | //button[contains(., 'Sign Up')]")
    FORGOT_PASSWORD_LINK = (By.XPATH, "//a[contains(text(), 'Forgot')] | //button[contains(., 'Forgot')]")
    ERROR_MESSAGE = (By.CSS_SELECTOR, ".error-message, .alert-danger, [role='alert']")

    def login(self, email: str, password: str):
        self.type_text(*self.EMAIL_INPUT, text=email)
        self.type_text(*self.PASSWORD_INPUT, text=password)
        return self.click(*self.LOGIN_SUBMIT_BTN)

    def navigate_to_signup(self):
        return self.click(*self.SIGNUP_LINK)

    def navigate_to_forgot_password(self):
        return self.click(*self.FORGOT_PASSWORD_LINK)

    def get_error_text(self) -> str:
        return self.get_text(*self.ERROR_MESSAGE)
