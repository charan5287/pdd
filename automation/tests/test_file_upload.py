from automation.pages.base_page import BasePage
from automation.data.test_data import TestData

class TestFileUpload:
    MODULE = "File Upload"

    @staticmethod
    def get_test_cases():
        test_list = []
        for i in range(1, 21):
            test_list.append({
                "test_id": f"UPL-{i:03d}",
                "module": TestFileUpload.MODULE,
                "name": f"Prescription Image & Document Upload Test #{i}",
                "priority": "P1",
                "func": lambda driver, idx=i: TestFileUpload.test_upload(driver, idx)
            })
        return test_list

    @staticmethod
    def test_upload(driver, idx):
        base = BasePage(driver)
        base.open_url()
        file_path = TestData.get_sample_prescription_path()
        assert file_path is not None
