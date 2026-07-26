from selenium.webdriver.common.by import By
from automation.pages.base_page import BasePage

class ScanPage(BasePage):
    FILE_INPUT = (By.CSS_SELECTOR, "input[type='file']")
    SCAN_BUTTON = (By.XPATH, "//button[contains(., 'Scan') or contains(., 'Analyze')]")
    OCR_RESULT_CARD = (By.CSS_SELECTOR, ".ocr-result, .scan-results, [data-testid='scan-result']")

    def upload_prescription_image(self, file_path: str):
        elem = self.find_element(*self.FILE_INPUT)
        if elem:
            elem.send_keys(file_path)
            return True
        return False

    def click_scan(self):
        return self.click(*self.SCAN_BUTTON)
