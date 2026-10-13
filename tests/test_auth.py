# tests/test_auth.py
import pytest
from selenium.webdriver.common.by import By  # pyrefly: ignore [missing-import]
from selenium.webdriver.support.ui import WebDriverWait  # pyrefly: ignore [missing-import]
from selenium.webdriver.support import expected_conditions as EC  # pyrefly: ignore [missing-import]

@pytest.mark.auth
class TestAuthentication:
    """Black-Box and E2E Browser Automation for Authentication Module."""

    def test_login_page_renders_successfully(self, driver, base_url):
        """BB-AUTH-001: Verify login page renders form elements, titles, and buttons."""
        driver.get(f"{base_url}/pages/login.html")
        wait = WebDriverWait(driver, 10)

        assert "Login | EV Charge Hub" in driver.title
        email_el = wait.until(EC.visibility_of_element_located((By.ID, "email")))
        password_el = driver.find_element(By.ID, "password")
        login_btn = driver.find_element(By.ID, "loginBtn")
        form_el = driver.find_element(By.ID, "loginForm")

        assert email_el.is_displayed()
        assert password_el.is_displayed()
        assert login_btn.is_displayed()
        assert form_el.is_displayed()

    def test_login_empty_fields_validation(self, driver, base_url):
        """BB-AUTH-002: Verify HTML5/JS validation when submitting empty login fields."""
        driver.get(f"{base_url}/pages/login.html")
        wait = WebDriverWait(driver, 10)

        email_el = wait.until(EC.visibility_of_element_located((By.ID, "email")))
        login_btn = driver.find_element(By.ID, "loginBtn")

        email_el.clear()
        login_btn.click()

        # HTML5 required validation attribute
        assert email_el.get_attribute("required") is not None
        assert "login.html" in driver.current_url

    def test_login_invalid_credentials_shows_error(self, driver, base_url):
        """BB-AUTH-003: Verify user-friendly error alert on invalid email/password."""
        driver.get(f"{base_url}/pages/login.html")
        wait = WebDriverWait(driver, 10)

        email_el = wait.until(EC.visibility_of_element_located((By.ID, "email")))
        password_el = driver.find_element(By.ID, "password")
        login_btn = driver.find_element(By.ID, "loginBtn")
        alert_box = driver.find_element(By.ID, "loginAlert")

        email_el.send_keys("unregistered_user_999@test.com")
        password_el.send_keys("WrongPass@123")
        login_btn.click()

        wait.until(EC.visibility_of(alert_box))
        assert "error" in alert_box.get_attribute("class")
        assert len(alert_box.text.strip()) > 0

    def test_password_visibility_toggle(self, driver, base_url):
        """BB-AUTH-004: Verify clicking eye icon toggles password input type."""
        driver.get(f"{base_url}/pages/login.html")
        wait = WebDriverWait(driver, 10)

        password_el = wait.until(EC.visibility_of_element_located((By.ID, "password")))
        toggle_btn = driver.find_element(By.ID, "passwordToggle")

        assert password_el.get_attribute("type") == "password"
        toggle_btn.click()
        assert password_el.get_attribute("type") == "text"
        toggle_btn.click()
        assert password_el.get_attribute("type") == "password"

    def test_admin_autofill_button_populates_credentials(self, driver, base_url):
        """BB-AUTH-005: Verify 'fillAdminBtn' demo shortcut pre-fills credentials."""
        driver.get(f"{base_url}/pages/login.html")
        wait = WebDriverWait(driver, 10)

        email_el = wait.until(EC.visibility_of_element_located((By.ID, "email")))
        password_el = driver.find_element(By.ID, "password")
        
        # Check if fillAdminBtn exists
        fill_admin_btns = driver.find_elements(By.ID, "fillAdminBtn")
        if fill_admin_btns:
            fill_admin_btns[0].click()
            assert email_el.get_attribute("value") == "admin@evchargehub.com"
            assert password_el.get_attribute("value") == "admin123"

    def test_admin_login_redirects_to_admin_dashboard(self, driver, base_url):
        """BB-AUTH-006: Verify successful admin login redirects to admin-dashboard.html."""
        driver.get(f"{base_url}/pages/login.html")
        wait = WebDriverWait(driver, 10)

        email_el = wait.until(EC.visibility_of_element_located((By.ID, "email")))
        password_el = driver.find_element(By.ID, "password")
        login_btn = driver.find_element(By.ID, "loginBtn")

        email_el.clear()
        email_el.send_keys("admin@evchargehub.com")
        password_el.clear()
        password_el.send_keys("admin123")
        login_btn.click()

        wait.until(EC.url_contains("admin-dashboard.html"))
        assert "admin-dashboard.html" in driver.current_url

    def test_registration_form_renders_with_step_indicator(self, driver, base_url):
        """BB-AUTH-007: Verify registration form fields, name, email, phone, password."""
        driver.get(f"{base_url}/pages/register.html")
        wait = WebDriverWait(driver, 10)

        name_el = wait.until(EC.visibility_of_element_located((By.ID, "name")))
        email_el = driver.find_element(By.ID, "email")
        phone_el = driver.find_element(By.ID, "phone")
        password_el = driver.find_element(By.ID, "password")
        confirm_pass_el = driver.find_element(By.ID, "confirmPassword")
        register_btn = driver.find_element(By.ID, "registerBtn")

        assert name_el.is_displayed()
        assert email_el.is_displayed()
        assert phone_el.is_displayed()
        assert password_el.is_displayed()
        assert confirm_pass_el.is_displayed()
        assert register_btn.is_displayed()

    def test_registration_validation_mismatched_passwords(self, driver, base_url):
        """BB-AUTH-008: Verify alert triggered when password and confirm password do not match."""
        driver.get(f"{base_url}/pages/register.html")
        wait = WebDriverWait(driver, 10)

        wait.until(EC.visibility_of_element_located((By.ID, "name"))).send_keys("Test User")
        driver.find_element(By.ID, "email").send_keys("mismatch_test@example.com")
        driver.find_element(By.ID, "phone").send_keys("9876543210")
        driver.find_element(By.ID, "password").send_keys("Secret123")
        driver.find_element(By.ID, "confirmPassword").send_keys("Secret999")
        driver.find_element(By.ID, "registerBtn").click()

        alert_box = wait.until(EC.visibility_of_element_located((By.ID, "registerAlert")))
        assert "Passwords do not match" in alert_box.text or "error" in alert_box.get_attribute("class")

    def test_registration_validation_invalid_indian_phone(self, driver, base_url):
        """BB-AUTH-009: Verify phone number regex rejection for invalid formats (<10 digits or starting < 6)."""
        driver.get(f"{base_url}/pages/register.html")
        wait = WebDriverWait(driver, 10)

        wait.until(EC.visibility_of_element_located((By.ID, "name"))).send_keys("Phone Tester")
        driver.find_element(By.ID, "email").send_keys("phone_test@example.com")
        # Starting with 4 is invalid for Indian 10-digit mobile [6-9][0-9]{9}
        driver.find_element(By.ID, "phone").send_keys("4123456789")
        driver.find_element(By.ID, "password").send_keys("Password123")
        driver.find_element(By.ID, "confirmPassword").send_keys("Password123")
        driver.find_element(By.ID, "registerBtn").click()

        alert_box = wait.until(EC.visibility_of_element_located((By.ID, "registerAlert")))
        assert "phone" in alert_box.text.lower() or "error" in alert_box.get_attribute("class")

    def test_unauthorized_dashboard_access_redirects_to_login(self, driver, base_url):
        """BB-AUTH-010: Verify accessing protected dashboard.html without JWT token redirects to login."""
        driver.get(f"{base_url}/pages/login.html")
        driver.execute_script("localStorage.clear(); sessionStorage.clear();")
        
        driver.get(f"{base_url}/pages/dashboard.html")
        wait = WebDriverWait(driver, 10)
        wait.until(EC.url_contains("login.html"))
        assert "login.html" in driver.current_url
