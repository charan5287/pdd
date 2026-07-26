import os
from datetime import datetime
from automation.utils.logger import logger

class ScreenshotHelper:
    @staticmethod
    def capture_screenshot(driver, test_name: str, status: str = "FAILED") -> str:
        try:
            screenshots_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'screenshots')
            os.makedirs(screenshots_dir, exist_ok=True)

            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            safe_name = "".join([c if c.isalnum() else "_" for c in test_name])
            filename = f"{safe_name}_{status}_{timestamp}.png"
            filepath = os.path.join(screenshots_dir, filename)

            driver.save_screenshot(filepath)
            logger.info(f"Screenshot captured: {filepath}")
            return filepath
        except Exception as e:
            logger.error(f"Failed to capture screenshot for test {test_name}: {e}")
            return ""
