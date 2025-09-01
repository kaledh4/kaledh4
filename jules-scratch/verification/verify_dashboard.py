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

            page.on('console', lambda msg: print(f"Browser console: {msg.text}"))

            page.goto('http://localhost:8000')

            # --- Verify initial state ---
            expect(page.locator('.data-table')).to_be_visible(timeout=10000)

            # Check for halving data in the first row
            first_row = page.locator('.data-table tbody tr').first
            expect(first_row.locator('td').first).to_have_text('Halving')

            # Check for "x" value calculation
            btc_row = page.locator('.data-table tbody tr:nth-child(2)')
            expect(btc_row.locator('td').last).to_have_text('2.22x')

            # Check initial color of a cell
            op_price_cell = page.get_by_role("cell", name="0.001")
            expect(op_price_cell).to_have_class('gradient-1') # Below default low threshold of 0.1

            # --- Change settings and verify update ---
            page.get_by_role("button", name="Settings").click()
            page.get_by_label("Low Price Threshold (Red):").fill("0.0005")
            high_threshold_input = page.get_by_label("High Price Threshold (Green):")
            high_threshold_input.fill("1.0")
            high_threshold_input.press("Enter")

            # Re-query the element after re-render
            op_price_cell_updated = page.get_by_role("cell", name="0.001")
            expect(op_price_cell_updated).to_have_class('gradient-2') # Now above the new low threshold

            page.screenshot(path="jules-scratch/verification/dashboard_final_v2.png")

            browser.close()
    finally:
        # Stop the server
        server_process.kill()

if __name__ == "__main__":
    run_verification()
