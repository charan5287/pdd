from selenium.webdriver.common.by import By
from automation.pages.base_page import BasePage

class ChatPage(BasePage):
    MESSAGE_INPUT = (By.CSS_SELECTOR, "input[placeholder*='Ask'], textarea[placeholder*='Ask']")
    SEND_BTN = (By.XPATH, "//button[contains(., 'Send') or @type='submit']")
    CHAT_BUBBLE = (By.CSS_SELECTOR, ".chat-bubble, .message-content, [data-testid='chat-message']")

    def send_message(self, prompt: str):
        self.type_text(*self.MESSAGE_INPUT, text=prompt)
        return self.click(*self.SEND_BTN)
