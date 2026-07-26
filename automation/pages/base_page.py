import time
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.by import By
from selenium.common.exceptions import TimeoutException, NoSuchElementException, ElementClickInterceptedException
from automation.utils.config import config
from automation.utils.logger import logger
from automation.utils.screenshot_helper import ScreenshotHelper

class BasePage:
    def __init__(self, driver):
        self.driver = driver
        self.wait = WebDriverWait(self.driver, config.explicit_wait)

    def open_url(self, path: str = ""):
        target = config.base_url
        if path:
            if target.endswith('/') and path.startswith('/'):
                target += path[1:]
            elif not target.endswith('/') and not path.startswith('/'):
                target += '/' + path
            else:
                target += path
        logger.info(f"Navigating to URL: {target}")
        self.driver.get(target)

    def find_element(self, by: By, locator: str, timeout: int = None):
        t = timeout or config.explicit_wait
        try:
            return WebDriverWait(self.driver, t).until(EC.presence_of_element_located((by, locator)))
        except TimeoutException:
            logger.warning(f"Element not found within {t}s: {by}={locator}")
            return None

    def find_visible_element(self, by: By, locator: str, timeout: int = None):
        t = timeout or config.explicit_wait
        try:
            return WebDriverWait(self.driver, t).until(EC.visibility_of_element_located((by, locator)))
        except TimeoutException:
            logger.warning(f"Element not visible within {t}s: {by}={locator}")
            return None

    def click(self, by: By, locator: str, timeout: int = None):
        t = timeout or config.explicit_wait
        try:
            elem = WebDriverWait(self.driver, t).until(EC.element_to_be_clickable((by, locator)))
            elem.click()
            logger.info(f"Clicked element: {by}={locator}")
            return True
        except (TimeoutException, ElementClickInterceptedException) as e:
            logger.warning(f"Standard click failed on {by}={locator} ({e}). Attempting JS click fallback.")
            return self.js_click(by, locator)

    def js_click(self, by: By, locator: str):
        try:
            elem = self.driver.find_element(by, locator)
            self.driver.execute_script("arguments[0].click();", elem)
            logger.info(f"JS Click executed on {by}={locator}")
            return True
        except Exception as e:
            logger.error(f"JS Click failed on {by}={locator}: {e}")
            return False

    def type_text(self, by: By, locator: str, text: str, clear_first: bool = True):
        elem = self.find_visible_element(by, locator)
        if elem:
            if clear_first:
                elem.clear()
            elem.send_keys(text)
            logger.info(f"Typed text into {by}={locator}")
            return True
        return False

    def get_text(self, by: By, locator: str) -> str:
        elem = self.find_element(by, locator)
        return elem.text if elem else ""

    def is_displayed(self, by: By, locator: str, timeout: int = 3) -> bool:
        try:
            elem = WebDriverWait(self.driver, timeout).until(EC.visibility_of_element_located((by, locator)))
            return elem.is_displayed()
        except TimeoutException:
            return False

    def get_current_url(self) -> str:
        return self.driver.current_url

    def get_title(self) -> str:
        return self.driver.title

    def scroll_to_element(self, by: By, locator: str):
        elem = self.find_element(by, locator)
        if elem:
            self.driver.execute_script("arguments[0].scrollIntoView({behavior: 'smooth', block: 'center'});", elem)

    def capture_screenshot(self, name: str) -> str:
        return ScreenshotHelper.capture_screenshot(self.driver, name)
