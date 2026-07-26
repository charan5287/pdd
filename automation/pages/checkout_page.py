from selenium.webdriver.common.by import By
from automation.pages.base_page import BasePage

class CheckoutPage(BasePage):
    ADDRESS_INPUT = (By.CSS_SELECTOR, "textarea[name='address'], input[placeholder*='Address']")
    PAYMENT_METHOD_RADIO = (By.CSS_SELECTOR, "input[name='paymentMethod'], input[type='radio']")
    PLACE_ORDER_BTN = (By.XPATH, "//button[contains(., 'Place Order') or contains(., 'Checkout') or contains(., 'Pay')]")
    ORDER_CONFIRMATION_MSG = (By.XPATH, "//*[contains(text(), 'Order Placed') or contains(text(), 'Success')]")

    def fill_address(self, address: str):
        return self.type_text(*self.ADDRESS_INPUT, text=address)

    def select_payment_method(self):
        return self.click(*self.PAYMENT_METHOD_RADIO)

    def place_order(self):
        return self.click(*self.PLACE_ORDER_BTN)

    def is_order_confirmed(self) -> bool:
        return self.is_displayed(*self.ORDER_CONFIRMATION_MSG)
