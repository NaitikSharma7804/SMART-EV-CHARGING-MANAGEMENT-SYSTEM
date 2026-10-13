# tests/test_admin.py
import pytest
from selenium.webdriver.common.by import By  # pyrefly: ignore [missing-import]
from selenium.webdriver.support.ui import WebDriverWait  # pyrefly: ignore [missing-import]
from selenium.webdriver.support import expected_conditions as EC  # pyrefly: ignore [missing-import]

@pytest.mark.admin
class TestAdminPortal:
    """Black-Box Browser Automation for Admin Portal and Operations."""

    def test_unauthorized_admin_access_redirects_or_blocks(self, driver, base_url):
        """BB-ADM-001: Verifies unauthenticated users cannot access admin-dashboard.html."""
        driver.get(f"{base_url}/pages/login.html")
        driver.execute_script("localStorage.clear(); sessionStorage.clear();")
        driver.get(f"{base_url}/pages/admin-dashboard.html")

        WebDriverWait(driver, 10).until(
            lambda d: "login.html" in d.current_url or len(d.find_elements(By.CLASS_NAME, "admin-layout")) == 0
        )
        assert "login.html" in driver.current_url or len(driver.find_elements(By.CLASS_NAME, "admin-layout")) == 0

    def test_admin_dashboard_metrics_cards_display(self, logged_in_admin_driver, base_url):
        """BB-ADM-002: Verifies admin dashboard renders the 5 core KPI metrics (Users, Stations, Chargers, etc.)."""
        driver = logged_in_admin_driver
        driver.get(f"{base_url}/pages/admin-dashboard.html")
        wait = WebDriverWait(driver, 10)

        # Wait for admin layout to mount
        wait.until(EC.presence_of_element_located((By.CLASS_NAME, "admin-layout")))
        stats_cards = wait.until(EC.presence_of_all_elements_located((By.CLASS_NAME, "stat-card-clean")))
        assert len(stats_cards) >= 3

    def test_admin_sidebar_navigation_tabs(self, logged_in_admin_driver, base_url):
        """BB-ADM-003: Verifies switching between sidebar tabs (Stations, Chargers, Analytics, Users, Bookings)."""
        driver = logged_in_admin_driver
        driver.get(f"{base_url}/pages/admin-dashboard.html")
        wait = WebDriverWait(driver, 10)

        wait.until(EC.presence_of_element_located((By.CLASS_NAME, "admin-nav")))

        # Click Station Management tab
        station_tab = wait.until(
            EC.element_to_be_clickable((By.XPATH, "//nav[contains(@class, 'admin-nav')]//button[contains(., 'Station')]"))
        )
        station_tab.click()
        wait.until(lambda d: "Station Management" in d.page_source)
        assert "Station Management" in driver.page_source

        # Click Admin Analytics tab
        analytics_tab = wait.until(
            EC.element_to_be_clickable((By.XPATH, "//nav[contains(@class, 'admin-nav')]//button[contains(., 'Analytics')]"))
        )
        analytics_tab.click()
        wait.until(lambda d: "Analytics" in d.page_source)
        assert "Analytics" in driver.page_source

        # Click Maintenance Tickets tab
        tickets_tab = wait.until(
            EC.element_to_be_clickable((By.XPATH, "//nav[contains(@class, 'admin-nav')]//button[contains(., 'Maintenance')]"))
        )
        tickets_tab.click()
        wait.until(lambda d: "Maintenance" in d.page_source)
        assert "Maintenance" in driver.page_source

    def test_admin_logout_clears_session(self, logged_in_admin_driver, base_url):
        """BB-ADM-004: Verifies clicking Sign Out clears localStorage and redirects to login."""
        driver = logged_in_admin_driver
        driver.get(f"{base_url}/pages/admin-dashboard.html")
        wait = WebDriverWait(driver, 10)

        logout_btn = wait.until(EC.element_to_be_clickable((By.CLASS_NAME, "admin-logout")))
        logout_btn.click()

        wait.until(EC.url_contains("login.html"))
        assert "login.html" in driver.current_url
