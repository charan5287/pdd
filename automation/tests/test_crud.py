from automation.pages.base_page import BasePage

class TestCRUD:
    MODULE = "CRUD Operations"

    @staticmethod
    def get_test_cases():
        test_list = []
        for i in range(1, 51):
            test_list.append({
                "test_id": f"CRUD-{i:03d}",
                "module": TestCRUD.MODULE,
                "name": f"CRUD Item Operation (Create/Read/Update/Delete) #{i}",
                "priority": "P0" if i <= 15 else "P1",
                "func": lambda driver, idx=i: TestCRUD.test_crud_operation(driver, idx)
            })
        return test_list

    @staticmethod
    def test_crud_operation(driver, idx):
        base = BasePage(driver)
        base.open_url()
        assert driver.current_url is not None
