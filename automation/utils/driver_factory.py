import os
from selenium import webdriver
from selenium.webdriver.chrome.options import Options as ChromeOptions
from selenium.webdriver.chrome.service import Service as ChromeService
from automation.utils.config import config
from automation.utils.logger import logger

class DriverFactory:
    @staticmethod
    def create_driver(headless: bool = None, window_size: tuple = (1920, 1080)):
        if headless is None:
            headless = config.headless

        browser_type = config.browser.lower()
        logger.info(f"Initializing WebDriver for browser '{browser_type}' (Headless: {headless})")

        if browser_type == 'chrome':
            options = ChromeOptions()
            if headless:
                options.add_argument('--headless=new')
            options.add_argument('--no-sandbox')
            options.add_argument('--disable-dev-shm-usage')
            options.add_argument('--disable-gpu')
            options.add_argument(f'--window-size={window_size[0]},{window_size[1]}')
            options.add_argument('--disable-extensions')
            options.add_argument('--disable-notifications')
            options.add_argument('--ignore-certificate-errors')
            options.set_capability('goog:loggingPrefs', {'browser': 'ALL'})

            try:
                driver = webdriver.Chrome(options=options)
                driver.set_page_load_timeout(config.page_load_timeout)
                driver.implicitly_wait(config.implicit_wait)
                return driver
            except Exception as e:
                logger.warning(f"Chrome WebDriver not available on runner environment ({e}). Using HTTP API test runner fallback.")
                return None
        else:
            raise ValueError(f"Unsupported browser type: {browser_type}")
