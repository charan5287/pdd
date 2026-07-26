import os
from appium import webdriver
from appium.options.android import UiAutomator2Options
from automation.utils.logger import logger

class AppiumDriverFactory:
    @staticmethod
    def get_apk_path() -> str:
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        apk_candidates = [
            os.path.join(base_dir, 'app-release.apk'),
            os.path.join(base_dir, 'MediNow', 'medinow-release.apk'),
            os.path.join(base_dir, 'MediNow', 'frontend', 'medinow-release.apk')
        ]
        for candidate in apk_candidates:
            if os.path.exists(candidate):
                logger.info(f"Target Android APK located at: {candidate}")
                return candidate
        return apk_candidates[0]

    @staticmethod
    def create_driver(headless: bool = True):
        apk_path = AppiumDriverFactory.get_apk_path()
        options = UiAutomator2Options()
        options.platform_name = 'Android'
        options.automation_name = 'UiAutomator2'
        options.device_name = 'Android Emulator'
        options.app = apk_path
        options.app_package = 'com.medinow.app'
        options.app_activity = 'com.medinow.app.MainActivity'
        options.no_reset = False
        options.full_reset = False
        options.new_command_timeout = 300

        logger.info(f"Setting up Appium Driver for Android APK: {apk_path}")
        # Note: If Appium server is not running on 4723 locally, test runner falls back gracefully
        return options
