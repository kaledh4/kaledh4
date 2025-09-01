import os
import subprocess
import time
from playwright.sync_api import sync_playwright, expect

def run_verification():
    # Start a simple HTTP server
    server_process = subprocess.Popen(['python', '-m', 'http.server', '8000'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(1) # Give the server a moment to start

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()

            page.goto('http://localhost:8000')

            # --- Verify live prices ---
            asset_grid = page.locator('#asset-grid')
            expect(asset_grid).to_be_visible()
            expect(asset_grid.locator('.asset-card')).to_have_count(10, timeout=15000) # Increased timeout for API calls

            all_cards = asset_grid.locator('.asset-card').all()
            btc_card = None
            for card in all_cards:
                if card.locator('.asset-name').inner_text() == 'BTC':
                    btc_card = card
                    break

            price_value = btc_card.locator('.risk-level')
            expect(price_value).to_contain_text('$', timeout=10000)
            expect(price_value).not_to_have_text('0.675')


            page.screenshot(path="jules-scratch/verification/dashboard_live_prices.png")

            browser.close()
    finally:
        # Stop the server
        server_process.kill()

if __name__ == "__main__":
    run_verification()
