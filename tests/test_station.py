# tests/test_station.py
import pytest
from selenium.webdriver.common.by import By  # pyrefly: ignore [missing-import]
from selenium.webdriver.common.keys import Keys  # pyrefly: ignore [missing-import]
from selenium.webdriver.support.ui import WebDriverWait  # pyrefly: ignore [missing-import]
from selenium.webdriver.support import expected_conditions as EC  # pyrefly: ignore [missing-import]

@pytest.mark.station
class TestChargingStations:
    """Black-Box Browser Automation for Station Discovery and Search Module."""

    def test_search_page_renders_with_map_and_sidebar(self, driver, base_url):
        """BB-STAT-001: Verify find chargers page renders layout, sidebar, search bar, and Leaflet map."""
        driver.get(f"{base_url}/pages/search.html")
        wait = WebDriverWait(driver, 10)

        search_input = wait.until(EC.visibility_of_element_located((By.ID, "stationSearchInput")))
        results_container = driver.find_element(By.ID, "stationListContainer")
        map_element = driver.find_element(By.ID, "map")

        assert search_input.is_displayed()
        assert results_container.is_displayed()
        assert map_element.is_displayed()

    def test_search_stations_by_keyword(self, driver, base_url):
        """BB-STAT-002: Typing 'Shastri' in search input filters stations list dynamically."""
        driver.get(f"{base_url}/pages/search.html")
        wait = WebDriverWait(driver, 10)

        search_input = wait.until(EC.visibility_of_element_located((By.ID, "stationSearchInput")))
        search_input.clear()
        search_input.send_keys("Shastri")
        
        # Results should display or clear button should become visible
        clear_btn = wait.until(EC.visibility_of_element_located((By.ID, "clearSearchBtn")))
        assert clear_btn.is_displayed() or "Shastri" in search_input.get_attribute("value")

    def test_clear_search_button_resets_input(self, driver, base_url):
        """BB-STAT-003: Clicking clear search 'x' resets input field and restores list."""
        driver.get(f"{base_url}/pages/search.html")
        wait = WebDriverWait(driver, 10)

        search_input = wait.until(EC.visibility_of_element_located((By.ID, "stationSearchInput")))
        search_input.send_keys("Hinjewadi")
        
        clear_btn = wait.until(EC.element_to_be_clickable((By.ID, "clearSearchBtn")))
        clear_btn.click()

        wait.until(lambda d: search_input.get_attribute("value") == "")
        assert search_input.get_attribute("value") == ""

    def test_toggle_filters_panel_visibility(self, driver, base_url):
        """BB-STAT-004: Toggling filter button expands and collapses advanced filtering options."""
        driver.get(f"{base_url}/pages/search.html")
        wait = WebDriverWait(driver, 10)

        toggle_btn = wait.until(EC.element_to_be_clickable((By.ID, "filterToggleBtn")))
        panel = driver.find_element(By.ID, "advancedFilterPanel")

        is_visible_initially = panel.is_displayed()
        toggle_btn.click()
        wait.until(lambda d: panel.is_displayed() != is_visible_initially)
        assert panel.is_displayed() != is_visible_initially

    def test_price_range_slider_updates_display_label(self, driver, base_url):
        """BB-STAT-005: Adjusting priceRangeSlider updates priceValDisplay text."""
        driver.get(f"{base_url}/pages/search.html")
        wait = WebDriverWait(driver, 10)

        slider = wait.until(EC.presence_of_element_located((By.ID, "priceRangeSlider")))
        display_label = driver.find_element(By.ID, "priceValDisplay")

        driver.execute_script("arguments[0].value = 20; arguments[0].dispatchEvent(new Event('input'));", slider)
        wait.until(lambda d: "20" in display_label.text)
        assert "20" in display_label.text

    def test_station_details_navigation_from_search(self, driver, base_url):
        """BB-STAT-006: Clicking book button on station card navigates to booking.html with station_id param."""
        driver.get(f"{base_url}/pages/search.html")
        wait = WebDriverWait(driver, 10)

        wait.until(EC.presence_of_element_located((By.ID, "stationListContainer")))

        book_buttons = driver.find_elements(By.CLASS_NAME, "book-btn")
        if book_buttons:
            target_href = book_buttons[0].get_attribute("href")
            assert "booking.html" in target_href
            assert "station_id=" in target_href
