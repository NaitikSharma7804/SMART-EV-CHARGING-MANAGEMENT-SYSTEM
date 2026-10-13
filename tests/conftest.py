# tests/conftest.py
import os
import time
import json
import pytest
from selenium import webdriver  # pyrefly: ignore [missing-import]
from selenium.webdriver.chrome.service import Service  # pyrefly: ignore [missing-import]
from selenium.webdriver.chrome.options import Options  # pyrefly: ignore [missing-import]
from selenium.webdriver.common.by import By  # pyrefly: ignore [missing-import]
from selenium.webdriver.support.ui import WebDriverWait  # pyrefly: ignore [missing-import]
from selenium.webdriver.support import expected_conditions as EC  # pyrefly: ignore [missing-import]
from webdriver_manager.chrome import ChromeDriverManager  # pyrefly: ignore [missing-import]

BASE_URL = os.getenv("BASE_URL", "http://localhost:5000")
API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:5000/api")

@pytest.fixture(scope="session")
def base_url():
    """Returns the base web URL under test."""
    return BASE_URL

@pytest.fixture(scope="session")
def api_base_url():
    """Returns the backend API base URL."""
    return API_BASE_URL

@pytest.fixture(scope="function")
def driver(request):
    """
    Initializes Chrome WebDriver with robust options and explicit waits.
    Captures high-resolution screenshot on test failure into reports/screenshots/.
    """
    chrome_options = Options()
    
    # Headless mode can be toggled via env var HEADLESS=0
    headless = os.getenv("HEADLESS", "1") == "1"
    if headless:
        chrome_options.add_argument("--headless=new")
        
    chrome_options.add_argument("--window-size=1920,1080")
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--disable-notifications")
    chrome_options.add_argument("--ignore-certificate-errors")
    
    # Initialize driver
    service = Service(ChromeDriverManager().install())
    _driver = webdriver.Chrome(service=service, options=chrome_options)  # type: ignore # pyrefly: ignore
    _driver.set_page_load_timeout(30)
    
    yield _driver
    
    # Check if test failed to capture screenshot
    if hasattr(request.node, "rep_call") and request.node.rep_call.failed:
        screenshots_dir = os.path.join(os.path.dirname(__file__), "..", "reports", "screenshots")
        os.makedirs(screenshots_dir, exist_ok=True)
        sanitized_name = request.node.name.replace("/", "_").replace("\\", "_").replace(":", "_")
        screenshot_path = os.path.join(screenshots_dir, f"{sanitized_name}_{int(time.time())}.png")
        try:
            _driver.save_screenshot(screenshot_path)
            print(f"\n[Screenshot Captured]: {screenshot_path}")
        except Exception as e:
            print(f"\nFailed to capture screenshot: {e}")
            
    _driver.quit()

@pytest.hookimpl(tryfirst=True, hookwrapper=True)
def pytest_runtest_makereport(item, call):
    """Hook to capture test outcome for screenshot fixture."""
    outcome = yield
    rep = outcome.get_result()
    setattr(item, "rep_" + rep.when, rep)

@pytest.fixture
def logged_in_driver(driver, base_url):
    """
    Fixture that navigates to login, injects or performs login for a standard driver user,
    and returns driver on the user dashboard.
    """
    driver.get(f"{base_url}/pages/login.html")
    wait = WebDriverWait(driver, 10)
    
    email_input = wait.until(EC.visibility_of_element_located((By.ID, "email")))
    password_input = driver.find_element(By.ID, "password")
    login_btn = driver.find_element(By.ID, "loginBtn")
    
    # Use real seeded user in database
    email_input.clear()
    email_input.send_keys("user@evchargehub.com")
    password_input.clear()
    password_input.send_keys("user123")
    login_btn.click()
    
    # Wait for dashboard navigation
    try:
        wait.until(EC.url_contains("dashboard.html"))
    except Exception:
        # Fallback to authentic token via API if UI click is delayed
        try:
            import requests
            r = requests.post(f"{base_url}/api/auth/login", json={"email": "user@evchargehub.com", "password": "user123"})
            if r.status_code == 200:
                data = r.json()
                token = data.get("token")
                user = data.get("user")
                driver.execute_script(f"""
                    localStorage.setItem('ev_token', '{token}');
                    localStorage.setItem('ev_user', JSON.stringify({json.dumps(user)}));
                """)
                driver.get(f"{base_url}/pages/dashboard.html")
        except Exception:
            pass

    return driver

@pytest.fixture
def logged_in_admin_driver(driver, base_url):
    """
    Fixture that logs in using the pre-seeded admin account and lands on admin-dashboard.html.
    """
    driver.get(f"{base_url}/pages/login.html")
    wait = WebDriverWait(driver, 10)
    
    email_input = wait.until(EC.visibility_of_element_located((By.ID, "email")))
    password_input = driver.find_element(By.ID, "password")
    login_btn = driver.find_element(By.ID, "loginBtn")
    
    email_input.clear()
    email_input.send_keys("admin@evchargehub.com")
    password_input.clear()
    password_input.send_keys("admin123")
    login_btn.click()
    
    try:
        wait.until(EC.url_contains("admin-dashboard.html"))
    except Exception:
        # Fallback to authentic admin token via API if UI click is delayed
        try:
            import requests
            r = requests.post(f"{base_url}/api/auth/login", json={"email": "admin@evchargehub.com", "password": "admin123"})
            if r.status_code == 200:
                data = r.json()
                token = data.get("token")
                user = data.get("user")
                driver.execute_script(f"""
                    localStorage.setItem('ev_token', '{token}');
                    localStorage.setItem('ev_user', JSON.stringify({json.dumps(user)}));
                """)
                driver.get(f"{base_url}/pages/admin-dashboard.html")
        except Exception:
            pass

    return driver
