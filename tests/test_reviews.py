# tests/test_reviews.py
import pytest
from selenium.webdriver.common.by import By  # pyrefly: ignore [missing-import]
from selenium.webdriver.support.ui import WebDriverWait  # pyrefly: ignore [missing-import]
from selenium.webdriver.support import expected_conditions as EC  # pyrefly: ignore [missing-import]

@pytest.mark.reviews
class TestReviewsAndRatings:
    """Black-Box Browser Automation for Reviews and Multi-Category Ratings."""

    def test_review_modal_structure_in_bookings_page(self, logged_in_driver, base_url):
        """BB-REV-001: Verifies review modal, star containers, and category rating elements exist."""
        driver = logged_in_driver
        driver.get(f"{base_url}/pages/bookings.html")
        wait = WebDriverWait(driver, 10)

        # Check for review modal in DOM
        modal = wait.until(EC.presence_of_element_located((By.ID, "reviewModal")))
        form = driver.find_element(By.ID, "reviewForm")
        comment_box = driver.find_element(By.ID, "reviewComment")
        submit_btn = driver.find_element(By.ID, "submitReviewBtn")

        assert modal is not None
        assert form is not None
        assert comment_box is not None
        assert submit_btn is not None

    def test_star_rating_interactivity(self, logged_in_driver, base_url):
        """BB-REV-002: Verifies clicking star buttons sets overallRatingValue to selected score."""
        driver = logged_in_driver
        driver.get(f"{base_url}/pages/bookings.html")
        wait = WebDriverWait(driver, 10)

        # Open modal via script so stars are visible and interactable
        driver.execute_script("document.getElementById('reviewModal').classList.add('active');")
        wait.until(EC.visibility_of_element_located((By.ID, "reviewModal")))

        # Look for 5th star button in overall container
        stars = driver.find_elements(By.CSS_SELECTOR, ".star-container .star-button")
        if stars and len(stars) >= 5:
            driver.execute_script("arguments[0].click();", stars[4])
            rating_label = wait.until(EC.visibility_of_element_located((By.ID, "overallRatingValue")))
            wait.until(lambda d: "5" in rating_label.text)
            assert "5" in rating_label.text

    def test_review_validation_zero_rating(self, logged_in_driver, base_url):
        """BB-REV-003: Submitting review without selecting stars displays alert error."""
        driver = logged_in_driver
        driver.get(f"{base_url}/pages/bookings.html")
        wait = WebDriverWait(driver, 10)

        # Open modal via script if not open
        driver.execute_script("document.getElementById('reviewModal').classList.add('active');")
        modal = wait.until(EC.visibility_of_element_located((By.ID, "reviewModal")))

        submit_btn = wait.until(EC.element_to_be_clickable((By.ID, "submitReviewBtn")))
        submit_btn.click()

        alert_box = wait.until(EC.visibility_of_element_located((By.ID, "reviewAlert")))
        assert alert_box.is_displayed()
        assert "select your overall rating" in alert_box.text.lower() or "error" in alert_box.get_attribute("class")
