# tests/test_chat.py
import pytest
from selenium.webdriver.common.by import By  # pyrefly: ignore [missing-import]
from selenium.webdriver.support.ui import WebDriverWait  # pyrefly: ignore [missing-import]
from selenium.webdriver.support import expected_conditions as EC  # pyrefly: ignore [missing-import]

@pytest.mark.chat
class TestChargeBotChat:
    """Black-Box Browser Automation for ChargeBot AI Assistant."""

    def test_chat_widget_button_visible_on_dashboard(self, logged_in_driver, base_url):
        """BB-CHAT-001: Verifies the floating ChargeBot button is visible on dashboard.html."""
        driver = logged_in_driver
        driver.get(f"{base_url}/pages/dashboard.html")
        wait = WebDriverWait(driver, 10)

        chat_btn = wait.until(EC.visibility_of_element_located((By.ID, "chat-toggle-btn")))
        assert chat_btn.is_displayed()

    def test_open_and_close_chat_drawer(self, logged_in_driver, base_url):
        """BB-CHAT-002: Verifies clicking chat button opens chat box, and close button hides it."""
        driver = logged_in_driver
        driver.get(f"{base_url}/pages/dashboard.html")
        wait = WebDriverWait(driver, 10)

        chat_btn = wait.until(EC.element_to_be_clickable((By.ID, "chat-toggle-btn")))
        chat_btn.click()

        chat_box = wait.until(EC.visibility_of_element_located((By.CLASS_NAME, "chat-box")))
        assert chat_box.is_displayed()

        close_btn = wait.until(EC.element_to_be_clickable((By.ID, "chat-close-btn")))
        try:
            close_btn.click()
        except Exception:
            driver.execute_script("arguments[0].click();", close_btn)
        wait.until(lambda d: not chat_box.is_displayed() or "open" not in chat_box.get_attribute("class"))
        assert not chat_box.is_displayed() or "open" not in chat_box.get_attribute("class")

    def test_send_ev_charging_question_receives_reply(self, logged_in_driver, base_url):
        """BB-CHAT-003: Asking 'How do I charge Nexon EV?' receives an assistant message bubble."""
        driver = logged_in_driver
        driver.get(f"{base_url}/pages/dashboard.html")
        wait = WebDriverWait(driver, 10)

        # Open chat
        chat_btn = wait.until(EC.element_to_be_clickable((By.ID, "chat-toggle-btn")))
        chat_btn.click()

        input_box = wait.until(EC.visibility_of_element_located((By.ID, "user-input")))
        send_btn = driver.find_element(By.ID, "send-btn")

        input_box.clear()
        input_box.send_keys("Which connector does Nexon EV use?")
        send_btn.click()

        # Check messages container
        messages_box = driver.find_element(By.ID, "chat-messages")
        assert messages_box.is_displayed()
        
        # Wait up to 10s for reply bubble
        wait.until(lambda d: len(d.find_elements(By.CSS_SELECTOR, ".chat-message.ai")) > 0)
        ai_bubbles = driver.find_elements(By.CSS_SELECTOR, ".chat-message.ai")
        assert len(ai_bubbles) > 0
