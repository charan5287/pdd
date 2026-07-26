from selenium.webdriver.common.by import By
from automation.pages.base_page import BasePage

class RemindersPage(BasePage):
    ADD_REMINDER_BTN = (By.XPATH, "//button[contains(., 'Add Reminder') or contains(., 'Set Reminder')]")
    REMINDER_ITEM = (By.CSS_SELECTOR, ".reminder-item, .card, [data-testid='reminder']")
    MARK_TAKEN_TOGGLE = (By.XPATH, "//button[contains(., 'Mark Taken') or contains(., 'Taken')] | //input[@type='checkbox']")
    TIME_INPUT = (By.CSS_SELECTOR, "input[type='time']")
    MEDICINE_NAME_INPUT = (By.CSS_SELECTOR, "input[placeholder*='Medicine']")

    def add_new_reminder(self, medicine: str, reminder_time: str = "08:00"):
        if self.click(*self.ADD_REMINDER_BTN):
            self.type_text(*self.MEDICINE_NAME_INPUT, text=medicine)
            if self.is_displayed(*self.TIME_INPUT, timeout=2):
                self.type_text(*self.TIME_INPUT, text=reminder_time)
            return True
        return False

    def toggle_mark_taken(self):
        return self.click(*self.MARK_TAKEN_TOGGLE)
