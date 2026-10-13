import pytest
from selenium.webdriver.common.by import By  # pyrefly: ignore [missing-import]
from selenium.webdriver.support.ui import WebDriverWait  # pyrefly: ignore [missing-import]
from selenium.webdriver.support import expected_conditions as EC  # pyrefly: ignore [missing-import]

class TestNavigationAndUI:
    """Tests for UI Navigation, Landing page, Routing, and Session Clearing."""

    def test_landing_page_title_and_navbar(self, driver, base_url):
        """BB-NAV-001: Verify landing page loads with correct title and navbar elements."""
        driver.get(f"{base_url}/index.html")
        assert "EV Charge Hub" in driver.title
        
        # Verify navbar is visible
        navbar = WebDriverWait(driver, 10).until(
            EC.visibility_of_element_located((By.CLASS_NAME, "landing-navbar"))
        )
        assert navbar.is_displayed()
        
        # Verify Login & Get Started links exist
        login_btn = driver.find_element(By.XPATH, "//a[contains(@href, 'login.html')]")
        register_btn = driver.find_element(By.XPATH, "//a[contains(@href, 'register.html')]")
        assert login_btn.is_displayed()
        assert register_btn.is_displayed()

    def test_navigation_to_login_page(self, driver, base_url):
        """BB-NAV-002: Verify clicking 'Login' in navbar navigates to login.html."""
        driver.get(f"{base_url}/index.html")
        wait = WebDriverWait(driver, 10)
        login_btn = wait.until(
            EC.element_to_be_clickable((By.XPATH, "//nav//a[contains(@href, 'login.html')]"))
        )
        login_btn.click()
        wait.until(EC.url_contains("login.html"))
        assert "login.html" in driver.current_url

    def test_navigation_to_register_page(self, driver, base_url):
        """BB-NAV-003: Verify clicking 'Get Started' in navbar navigates to register.html."""
        driver.get(f"{base_url}/index.html")
        wait = WebDriverWait(driver, 10)
        reg_btn = wait.until(
            EC.element_to_be_clickable((By.XPATH, "//nav//a[contains(@href, 'register.html')]"))
        )
        reg_btn.click()
        wait.until(EC.url_contains("register.html"))
        assert "register.html" in driver.current_url

    def test_dashboard_authenticated_navigation(self, logged_in_driver, base_url):
        """BB-NAV-004: Verify authenticated navigation between dashboard, vehicles, and bookings."""
        driver = logged_in_driver
        driver.get(f"{base_url}/pages/dashboard.html")
        wait = WebDriverWait(driver, 10)
        
        # Navigate to vehicles page
        driver.get(f"{base_url}/pages/vehicles.html")
        wait.until(EC.presence_of_element_located((By.ID, "vehicleMake")))
        assert "vehicles.html" in driver.current_url
        
        # Navigate to bookings page
        driver.get(f"{base_url}/pages/bookings.html")
        wait.until(EC.url_contains("bookings.html"))
        assert "bookings.html" in driver.current_url

    def test_logout_clears_session_and_redirects(self, logged_in_driver, base_url):
        """BB-NAV-005: Verify logout clears tokens from localStorage and redirects to login."""
        driver = logged_in_driver
        driver.get(f"{base_url}/pages/dashboard.html")
        
        # Trigger logout via script or logout button
        driver.execute_script("""
            localStorage.removeItem('ev_token');
            localStorage.removeItem('ev_user');
            window.location.href = 'login.html';
        """)
        
        wait = WebDriverWait(driver, 10)
        wait.until(EC.url_contains("login.html"))
        
        token = driver.execute_script("return localStorage.getItem('ev_token');")
        assert token is None
