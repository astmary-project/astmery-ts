from playwright.sync_api import sync_playwright

def verify_header_and_sidebar():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Desktop verification
        context_desktop = browser.new_context(viewport={'width': 1280, 'height': 720})
        page_desktop = context_desktop.new_page()
        try:
            page_desktop.goto("http://localhost:3000")
            page_desktop.wait_for_load_state("networkidle")
            page_desktop.screenshot(path="verification/desktop.png")
            print("Desktop screenshot taken.")
        except Exception as e:
            print(f"Desktop verification failed: {e}")

        # Mobile verification
        context_mobile = browser.new_context(viewport={'width': 375, 'height': 667})
        page_mobile = context_mobile.new_page()
        try:
            page_mobile.goto("http://localhost:3000")
            page_mobile.wait_for_load_state("networkidle")
            page_mobile.screenshot(path="verification/mobile_closed.png")
            print("Mobile (closed) screenshot taken.")

            # Click hamburger menu
            # The button has a span "Toggle Menu" with sr-only class.
            # We can find it by role button
            # But let's look for the Menu icon or just the button.
            # In AppHeader.tsx: <Button variant="ghost" size="icon" ...><Menu ...><span class="sr-only">Toggle Menu</span>

            # We can try to click the button by its accessible name "Toggle Menu"
            page_mobile.get_by_role("button", name="Toggle Menu").click()

            # Wait for sheet to open
            page_mobile.wait_for_timeout(1000)
            page_mobile.screenshot(path="verification/mobile_open.png")
            print("Mobile (open) screenshot taken.")

        except Exception as e:
            print(f"Mobile verification failed: {e}")

        browser.close()

if __name__ == "__main__":
    verify_header_and_sidebar()
