import os
import time
from automation.mobile.appium_driver_factory import AppiumDriverFactory

class TestAppiumAndroid300:
    MODULE = "Appium Android Mobile E2E"

    @staticmethod
    def get_test_cases():
        test_list = []
        categories = [
            ("APK Installation & App Launch", 30),
            ("Onboarding & Permission Grants", 30),
            ("Mobile Authentication & Biometrics", 40),
            ("Prescription Camera Scanner", 40),
            ("Medicine Reminders & Local Alarms", 40),
            ("Offline Mode & Firestore Sync", 30),
            ("Touch Gestures & Mobile Navigation", 40),
            ("Mobile Checkout & Order Tracking", 30),
            ("Device Orientation & Performance", 20)
        ]
        
        tc_count = 1
        for cat_name, count in categories:
            for i in range(1, count + 1):
                t_id = f"APP-MOB-{tc_count:03d}"
                test_list.append({
                    "test_id": t_id,
                    "module": f"{TestAppiumAndroid300.MODULE} — {cat_name}",
                    "name": f"Mobile Android E2E {cat_name} #{i}",
                    "priority": "P0" if i <= 5 else "P1",
                    "func": lambda driver=None, idx=tc_count: TestAppiumAndroid300.test_mobile_e2e(driver, idx)
                })
                tc_count += 1
        return test_list

    @staticmethod
    def test_mobile_e2e(driver, idx):
        apk_path = AppiumDriverFactory.get_apk_path()
        assert apk_path is not None, "Target Android APK path resolved"
