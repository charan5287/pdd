from selenium.webdriver.common.by import By
from automation.pages.base_page import BasePage

class MedicinesPage(BasePage):
    ADD_MEDICINE_BTN = (By.XPATH, "//button[contains(., 'Add Medicine') or contains(., 'New Medicine')]")
    SEARCH_BAR = (By.CSS_SELECTOR, "input[placeholder*='Search medicine']")
    MEDICINE_CARD = (By.CSS_SELECTOR, ".medicine-card, .grid > div, [data-testid='medicine-card']")
    ADD_TO_CART_BTN = (By.XPATH, "//button[contains(., 'Add to Cart') or contains(., 'Cart')]")
    CATEGORY_TAB_ALL = (By.XPATH, "//button[contains(., 'All')]")
    CATEGORY_TAB_PRESCRIPTION = (By.XPATH, "//button[contains(., 'Prescription')]")

    def click_add_medicine(self):
        return self.click(*self.ADD_MEDICINE_BTN)

    def search_medicine(self, name: str):
        return self.type_text(*self.SEARCH_BAR, text=name)

    def add_first_medicine_to_cart(self):
        return self.click(*self.ADD_TO_CART_BTN)
