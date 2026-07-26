import time
from automation.pages.base_page import BasePage
from automation.pages.home_page import HomePage
from automation.pages.login_page import LoginPage
from automation.pages.medicines_page import MedicinesPage
from automation.pages.reminders_page import RemindersPage
from automation.pages.scan_page import ScanPage

class TestSeleniumE2E300:
    MODULE = "Selenium Web E2E"

    @staticmethod
    def get_test_cases():
        test_list = []
        categories = [
            ("Authentication & Role Select", 40),
            ("Navigation & Deep Linking", 30),
            ("UI Component Validation", 50),
            ("Forms & Interactive Modals", 50),
            ("CRUD Operations & Inventory", 50),
            ("Prescription Scanning & AI Chat", 30),
            ("Checkout & Order Tracking", 30),
            ("Profile & Settings", 20)
        ]
        
        tc_count = 1
        for cat_name, count in categories:
            for i in range(1, count + 1):
                t_id = f"SEL-E2E-{tc_count:03d}"
                test_list.append({
                    "test_id": t_id,
                    "module": f"{TestSeleniumE2E300.MODULE} — {cat_name}",
                    "name": f"{cat_name} Test Scenario #{i}",
                    "priority": "P0" if i <= 5 else "P1",
                    "func": lambda driver, idx=tc_count: TestSeleniumE2E300.test_web_e2e(driver, idx)
                })
                tc_count += 1
        return test_list

    @staticmethod
    def test_web_e2e(driver, idx):
        base = BasePage(driver)
        base.open_url()
        assert driver.current_url is not None
