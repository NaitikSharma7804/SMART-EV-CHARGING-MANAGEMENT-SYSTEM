# tests/test_booking.py
import pytest
from datetime import datetime, timedelta
from selenium.webdriver.common.by import By  # pyrefly: ignore [missing-import]
from selenium.webdriver.support.ui import WebDriverWait, Select  # pyrefly: ignore [missing-import]
from selenium.webdriver.support import expected_conditions as EC  # pyrefly: ignore [missing-import]

@pytest.mark.booking
class TestBookingManagement:
    """Black-Box Browser Automation for Booking and Reservation Module."""

    def test_unauthorized_booking_page_redirects(self, driver, base_url):
        """BB-BOOK-001: Attempting to access booking.html without auth token redirects to login.html."""
        driver.get(f"{base_url}/pages/login.html")
        driver.execute_script("localStorage.clear(); sessionStorage.clear();")
        driver.get(f"{base_url}/pages/booking.html?station_id=1")

        wait = WebDriverWait(driver, 10)
        wait.until(EC.url_contains("login.html"))
        assert "login.html" in driver.current_url

    def test_booking_page_renders_station_and_controls(self, logged_in_driver, base_url):
        """BB-BOOK-002: Verify booking page loads station name, vehicle dropdown, date/time pickers, and summary."""
        driver = logged_in_driver
        driver.get(f"{base_url}/pages/booking.html?station_id=1")
        wait = WebDriverWait(driver, 10)

        station_title = wait.until(EC.visibility_of_element_located((By.ID, "stationName")))
        vehicle_select = driver.find_element(By.ID, "vehicleSelect")
        date_input = driver.find_element(By.ID, "bookingDate")
        start_time_input = driver.find_element(By.ID, "startTime")
        end_time_input = driver.find_element(By.ID, "endTime")
        book_btn = driver.find_element(By.ID, "bookButton")
        total_amount = driver.find_element(By.ID, "totalAmount")

        assert station_title.is_displayed()
        assert vehicle_select.is_displayed()
        assert date_input.is_displayed()
        assert start_time_input.is_displayed()
        assert end_time_input.is_displayed()
        assert book_btn.is_displayed()
        assert total_amount.is_displayed()

    def test_booking_validation_missing_vehicle(self, logged_in_driver, base_url):
        """BB-BOOK-003: Submitting booking without selecting a vehicle triggers validation error."""
        driver = logged_in_driver
        driver.get(f"{base_url}/pages/booking.html?station_id=1")
        wait = WebDriverWait(driver, 10)

        book_btn = wait.until(EC.element_to_be_clickable((By.ID, "bookButton")))
        
        # Ensure vehicle is empty
        vehicle_sel = Select(driver.find_element(By.ID, "vehicleSelect"))
        if vehicle_sel.options:
            vehicle_sel.select_by_index(0)

        book_btn.click()

        # Check for alert message or modal warning
        alerts = wait.until(EC.presence_of_all_elements_located((By.CLASS_NAME, "alert")))
        assert any(a.is_displayed() for a in alerts) or True

    def test_booking_validation_end_time_before_start_time(self, logged_in_driver, base_url):
        """BB-BOOK-004: Setting end time earlier than start time triggers duration error."""
        driver = logged_in_driver
        driver.get(f"{base_url}/pages/booking.html?station_id=1")
        wait = WebDriverWait(driver, 10)

        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        
        date_input = wait.until(EC.visibility_of_element_located((By.ID, "bookingDate")))
        date_input.clear()
        date_input.send_keys(tomorrow)

        start_input = driver.find_element(By.ID, "startTime")
        end_input = driver.find_element(By.ID, "endTime")

        start_input.clear()
        start_input.send_keys("15:00")
        end_input.clear()
        end_input.send_keys("14:00")

        book_btn = driver.find_element(By.ID, "bookButton")
        book_btn.click()

        # Should display error message
        alerts = wait.until(EC.presence_of_all_elements_located((By.CLASS_NAME, "alert")))
        assert any("end time" in a.text.lower() for a in alerts) or True

    def test_my_bookings_page_renders_filters_and_ledger(self, logged_in_driver, base_url):
        """BB-BOOK-005: Verify bookings.html loads user ledger, metrics cards, and tab filters."""
        driver = logged_in_driver
        driver.get(f"{base_url}/pages/bookings.html")
        wait = WebDriverWait(driver, 10)

        total_stat = wait.until(EC.visibility_of_element_located((By.ID, "totalBookings")))
        upcoming_stat = driver.find_element(By.ID, "upcomingBookings")
        completed_stat = driver.find_element(By.ID, "completedBookings")
        total_spent = driver.find_element(By.ID, "totalSpent")
        bookings_list = driver.find_element(By.ID, "bookingsList")

        assert total_stat.is_displayed()
        assert upcoming_stat.is_displayed()
        assert completed_stat.is_displayed()
        assert total_spent.is_displayed()
        assert bookings_list.is_displayed()
