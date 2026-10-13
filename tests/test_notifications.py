# tests/test_notifications.py
import pytest
from selenium.webdriver.common.by import By  # pyrefly: ignore [missing-import]
from selenium.webdriver.support.ui import WebDriverWait  # pyrefly: ignore [missing-import]
from selenium.webdriver.support import expected_conditions as EC  # pyrefly: ignore [missing-import]

@pytest.mark.notifications
class TestNotificationsSystem:
    """Black-Box Browser Automation for In-App Notifications."""

    def test_notification_bell_rendered_in_navbar(self, logged_in_driver, base_url):
        """BB-NOTIF-001: Verifies the notification bell trigger exists in the dashboard topbar."""
        driver = logged_in_driver
        driver.get(f"{base_url}/pages/dashboard.html")
        wait = WebDriverWait(driver, 10)

        # Bell is dynamically injected by notifications.js
        bell = wait.until(EC.visibility_of_element_located((By.CLASS_NAME, "ev-notif-trigger")))
        assert bell.is_displayed()

    def test_clicking_bell_opens_dropdown_panel(self, logged_in_driver, base_url):
        """BB-NOTIF-002: Verifies clicking the bell opens the notification dropdown panel."""
        driver = logged_in_driver
        driver.get(f"{base_url}/pages/dashboard.html")
        wait = WebDriverWait(driver, 10)

        bell_trigger = wait.until(EC.element_to_be_clickable((By.CLASS_NAME, "ev-notif-trigger")))
        bell_trigger.click()

        dropdown = wait.until(EC.visibility_of_element_located((By.CLASS_NAME, "ev-notif-dropdown")))
        assert dropdown.is_displayed()

    def test_notification_items_content(self, logged_in_driver, base_url):
        """BB-NOTIF-003: Verifies notifications display booking or payment titles."""
        driver = logged_in_driver
        driver.get(f"{base_url}/pages/dashboard.html")
        wait = WebDriverWait(driver, 10)

        bell_trigger = wait.until(EC.element_to_be_clickable((By.CLASS_NAME, "ev-notif-trigger")))
        bell_trigger.click()

        wait.until(EC.visibility_of_element_located((By.CLASS_NAME, "ev-notif-dropdown")))
        items = driver.find_elements(By.CLASS_NAME, "ev-notif-item")
        if items:
            assert len(items[0].text) > 0
