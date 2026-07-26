from selenium.webdriver.common.by import By
from automation.pages.base_page import BasePage

class PortalSelectionPage(BasePage):
    # Locators
    PATIENT_PORTAL_BTN = (By.XPATH, "//button[contains(., 'Patient App') or contains(., 'Patient Portal') or contains(., 'Patient')]")
    PHARMACY_PORTAL_BTN = (By.XPATH, "//button[contains(., 'Pharmacy App') or contains(., 'Pharmacy Portal') or contains(., 'Pharmacy')]")
    TITLE_HEADING = (By.XPATH, "//h1 | //h2 | //*[contains(text(), 'MediNow')]")

    def select_patient_portal(self):
        return self.click(*self.PATIENT_PORTAL_BTN)

    def select_pharmacy_portal(self):
        return self.click(*self.PHARMACY_PORTAL_BTN)

    def is_loaded(self) -> bool:
        return self.is_displayed(*self.TITLE_HEADING)
