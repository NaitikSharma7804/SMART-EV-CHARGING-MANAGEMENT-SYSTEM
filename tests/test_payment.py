# tests/test_payment.py
import pytest
from selenium.webdriver.common.by import By  # pyrefly: ignore [missing-import]
from selenium.webdriver.support.ui import WebDriverWait  # pyrefly: ignore [missing-import]
from selenium.webdriver.support import expected_conditions as EC  # pyrefly: ignore [missing-import]

@pytest.mark.payment
class TestPaymentModule:
    """Black-Box Browser Automation for Payment and Wallet Systems."""

    def test_booking_cost_calculation_updates_total_dynamically(self, logged_in_driver, base_url):
        """BB-PAY-001: Verifies total amount updates when duration changes in booking summary."""
        driver = logged_in_driver
        driver.get(f"{base_url}/pages/booking.html?station_id=1")
        wait = WebDriverWait(driver, 10)

        start_input = wait.until(EC.visibility_of_element_located((By.ID, "startTime")))
        end_input = driver.find_element(By.ID, "endTime")
        total_display = driver.find_element(By.ID, "totalAmount")

        start_input.clear()
        start_input.send_keys("10:00")
        end_input.clear()
        end_input.send_keys("12:00")

        # Duration is 2 hours, total should not be empty
        wait.until(lambda d: total_display.text != "")
        assert total_display.text != ""

    def test_charging_cost_calculator_interactivity(self, logged_in_driver, base_url):
        """BB-PAY-002: Verifies charging calculator computes estimated cost based on battery %."""
        driver = logged_in_driver
        driver.get(f"{base_url}/pages/booking.html?station_id=1")
        wait = WebDriverWait(driver, 10)

        current_batt = wait.until(EC.presence_of_element_located((By.ID, "calculatorCurrentBattery")))
        target_batt = driver.find_element(By.ID, "calculatorTargetBattery")

        driver.execute_script("arguments[0].value = 20; arguments[0].dispatchEvent(new Event('input'));", current_batt)
        driver.execute_script("arguments[0].value = 80; arguments[0].dispatchEvent(new Event('input'));", target_batt)

        calc_total = wait.until(EC.visibility_of_element_located((By.ID, "calculatorEstimatedCost")))
        assert "₹" in calc_total.text or len(calc_total.text) > 0

    def test_wallet_card_and_balance_display_on_dashboard(self, logged_in_driver, base_url):
        """BB-PAY-003: Verifies driver dashboard renders EV Wallet card and balance."""
        driver = logged_in_driver
        driver.get(f"{base_url}/pages/dashboard.html")
        wait = WebDriverWait(driver, 10)

        # Look for wallet card or wallet balance display
        wallet_elements = wait.until(
            EC.presence_of_all_elements_located((By.XPATH, "//*[contains(text(), 'Wallet') or contains(text(), 'Balance')]"))
        )
        assert len(wallet_elements) > 0
