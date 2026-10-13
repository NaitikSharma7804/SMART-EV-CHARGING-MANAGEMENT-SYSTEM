import pytest
from selenium.webdriver.common.by import By  # pyrefly: ignore [missing-import]
from selenium.webdriver.support.ui import WebDriverWait  # pyrefly: ignore [missing-import]
from selenium.webdriver.support import expected_conditions as EC  # pyrefly: ignore [missing-import]
import json

class TestUserProfile:
    """Tests for User Management, Profile display, and session authorization."""

    def test_dashboard_displays_logged_in_user_name(self, logged_in_driver, base_url):
        """BB-USER-001: Verify dashboard displays logged-in user's name from session."""
        driver = logged_in_driver
        driver.get(f"{base_url}/pages/dashboard.html")
        wait = WebDriverWait(driver, 10)
        
        user_name_elem = wait.until(EC.visibility_of_element_located((By.ID, "userName")))
        assert user_name_elem.is_displayed()
        # Should not be empty
        assert len(user_name_elem.text.strip()) > 0

    def test_unauthorized_dashboard_access_redirects(self, driver, base_url):
        """BB-USER-002: Verify accessing dashboard without token redirects to login."""
        driver.get(f"{base_url}/pages/dashboard.html")
        driver.execute_script("localStorage.clear(); sessionStorage.clear();")
        driver.get(f"{base_url}/pages/dashboard.html")
        
        WebDriverWait(driver, 10).until(
            lambda d: "login.html" in d.current_url or "pages/login" in d.current_url
        )
        assert "login" in driver.current_url.lower()

    def test_fetch_user_profile_api_via_browser(self, logged_in_driver, base_url):
        """BB-USER-003: Verify GET /api/users/profile returns valid user details for active token."""
        driver = logged_in_driver
        script = """
            const done = arguments[0];
            const token = localStorage.getItem('ev_token');
            fetch('/api/users/profile', {
                headers: { 'Authorization': 'Bearer ' + token }
            })
            .then(res => res.json())
            .then(data => done(data))
            .catch(err => done({ success: false, error: err.message }));
        """
        result = driver.execute_async_script(script)
        assert result.get("success") is True
        assert "data" in result
        assert "email" in result["data"]

    def test_update_user_profile_api_via_browser(self, logged_in_driver, base_url):
        """BB-USER-004: Verify PUT /api/users/profile updates user details successfully."""
        driver = logged_in_driver
        script = """
            const done = arguments[0];
            const token = localStorage.getItem('ev_token');
            fetch('/api/users/profile', {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token 
                },
                body: JSON.stringify({ name: 'Automated Tester', mobile: '9876543210' })
            })
            .then(res => res.json())
            .then(data => done(data))
            .catch(err => done({ success: false, error: err.message }));
        """
        result = driver.execute_async_script(script)
        assert result.get("success") is True
        assert "successfully" in result.get("message", "").lower()
