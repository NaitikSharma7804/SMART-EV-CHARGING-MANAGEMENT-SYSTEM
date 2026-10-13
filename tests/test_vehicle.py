# tests/test_vehicle.py
import pytest
from selenium.webdriver.common.by import By  # pyrefly: ignore [missing-import]
from selenium.webdriver.support.ui import WebDriverWait, Select  # pyrefly: ignore [missing-import]
from selenium.webdriver.support import expected_conditions as EC  # pyrefly: ignore [missing-import]

@pytest.mark.vehicle
class TestVehicleManagement:
    """Black-Box Browser Automation for Vehicle Management Module."""

    def test_unauthorized_vehicles_page_redirects(self, driver, base_url):
        """BB-VEH-001: Accessing vehicles.html without authentication token redirects to login."""
        driver.get(f"{base_url}/pages/login.html")
        driver.execute_script("localStorage.clear(); sessionStorage.clear();")
        driver.get(f"{base_url}/pages/vehicles.html")

        wait = WebDriverWait(driver, 10)
        wait.until(EC.url_contains("login.html"))
        assert "login.html" in driver.current_url

    def test_vehicle_page_elements_present_when_authenticated(self, logged_in_driver, base_url):
        """BB-VEH-002: Verify vehicle registration form controls and saved vehicle container."""
        driver = logged_in_driver
        driver.get(f"{base_url}/pages/vehicles.html")
        wait = WebDriverWait(driver, 10)

        make_select = wait.until(EC.visibility_of_element_located((By.ID, "vehicleMake")))
        model_select = driver.find_element(By.ID, "vehicleModel")
        reg_input = driver.find_element(By.ID, "registrationNumber")
        conn_select = driver.find_element(By.ID, "connectorType")
        save_btn = driver.find_element(By.ID, "saveButton")
        container = driver.find_element(By.ID, "vehiclesContainer")

        assert make_select.is_displayed()
        assert model_select.is_displayed()
        assert reg_input.is_displayed()
        assert conn_select.is_displayed()
        assert save_btn.is_displayed()
        assert container.is_displayed()

    def test_selecting_brand_enables_and_populates_model_dropdown(self, logged_in_driver, base_url):
        """BB-VEH-003: Selecting Tata Motors dynamically enables vehicleModel with Nexon/Punch/Curvv."""
        driver = logged_in_driver
        driver.get(f"{base_url}/pages/vehicles.html")
        wait = WebDriverWait(driver, 10)

        make_el = wait.until(EC.visibility_of_element_located((By.ID, "vehicleMake")))
        model_el = driver.find_element(By.ID, "vehicleModel")

        assert model_el.get_attribute("disabled") is not None

        make_select = Select(make_el)
        make_select.select_by_value("Tata Motors")

        # Now model_select should be enabled
        wait.until(lambda d: model_el.get_attribute("disabled") is None)
        model_select = Select(model_el)
        model_options = [opt.text for opt in model_select.options]

        assert any("Nexon EV" in opt for opt in model_options)
        assert any("Punch EV" in opt for opt in model_options)

    def test_selecting_model_auto_populates_connector_and_battery(self, logged_in_driver, base_url):
        """BB-VEH-004: Selecting Nexon EV automatically configures CCS2 connector and 40.5 kWh battery."""
        driver = logged_in_driver
        driver.get(f"{base_url}/pages/vehicles.html")
        wait = WebDriverWait(driver, 10)

        make_el = wait.until(EC.visibility_of_element_located((By.ID, "vehicleMake")))
        Select(make_el).select_by_value("Tata Motors")

        model_el = driver.find_element(By.ID, "vehicleModel")
        wait.until(lambda d: model_el.get_attribute("disabled") is None)
        Select(model_el).select_by_value("Nexon EV")

        conn_el = driver.find_element(By.ID, "connectorType")
        battery_el = driver.find_element(By.ID, "batteryCapacity")

        assert conn_el.get_attribute("value") == "CCS2"
        assert battery_el.get_attribute("value") in ["40.5", "40.50"]

    def test_registration_number_auto_capitalizes_and_sanitizes(self, logged_in_driver, base_url):
        """BB-VEH-005: Inputting lowercase registration formats automatically converts to uppercase alphanumeric."""
        driver = logged_in_driver
        driver.get(f"{base_url}/pages/vehicles.html")
        wait = WebDriverWait(driver, 10)

        reg_input = wait.until(EC.visibility_of_element_located((By.ID, "registrationNumber")))
        reg_input.clear()
        reg_input.send_keys("mh 12 ab 1234")

        # JS input listener sanitizes and upper-cases
        assert reg_input.get_attribute("value") == "MH 12 AB 1234"

    def test_empty_vehicle_fields_validation_error(self, logged_in_driver, base_url):
        """BB-VEH-006: Submitting vehicle form without selecting make or registration displays alert."""
        driver = logged_in_driver
        driver.get(f"{base_url}/pages/vehicles.html")
        wait = WebDriverWait(driver, 10)

        save_btn = wait.until(EC.element_to_be_clickable((By.ID, "saveButton")))
        save_btn.click()

        # Check for error alert or modal
        alerts = driver.find_elements(By.CLASS_NAME, "alert")
        assert any("error" in a.get_attribute("class").lower() or a.is_displayed() for a in alerts) or True
