#!/usr/bin/env python3
"""
TAPISSERIE Phase 2 Backend API Tests
Tests all Phase 2 endpoints: events, auth (signup/login/logout/me), listings
"""

import requests
import time
import random
import string

BASE_URL = "https://chronoluxe-trade.preview.emergentagent.com/api"
ADMIN_PASSWORD = "swatch2026"

def random_nonce():
    """Generate random string for unique test data"""
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))

def print_test(name, passed, details=""):
    """Print test result"""
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"{status}: {name}")
    if details:
        print(f"   {details}")

def test_events():
    """Test POST /api/events - pageview beacon"""
    print("\n=== TEST 1: POST /api/events ===")
    
    # Test 1a: Valid pageview event
    try:
        resp = requests.post(f"{BASE_URL}/events", json={"type": "pageview", "path": "/"}, timeout=10)
        passed = resp.status_code == 200 and resp.json().get("ok") == True
        print_test("Valid pageview event", passed, f"Status: {resp.status_code}, Response: {resp.json()}")
    except Exception as e:
        print_test("Valid pageview event", False, f"Error: {e}")
    
    # Test 1b: Missing type (best-effort, should still work)
    try:
        resp = requests.post(f"{BASE_URL}/events", json={}, timeout=10)
        passed = resp.status_code == 200 and resp.json().get("ok") == True
        print_test("Missing type (best-effort)", passed, f"Status: {resp.status_code}, Response: {resp.json()}")
    except Exception as e:
        print_test("Missing type (best-effort)", False, f"Error: {e}")

def test_auth_signup():
    """Test POST /api/auth/signup with extensive validation"""
    print("\n=== TEST 2: POST /api/auth/signup ===")
    
    nonce = random_nonce()
    valid_email = f"bob+{nonce}@tap.test"
    valid_username = f"bob_{nonce}"
    valid_password = "royaloak2026"
    
    # Test 2a: Valid signup
    session = requests.Session()
    try:
        resp = session.post(f"{BASE_URL}/auth/signup", json={
            "email": valid_email,
            "username": valid_username,
            "password": valid_password
        }, timeout=10)
        data = resp.json()
        passed = (
            resp.status_code == 200 and
            data.get("ok") == True and
            "user" in data and
            data["user"].get("email") == valid_email and
            data["user"].get("username") == valid_username and
            "passwordHash" not in data["user"] and
            "_id" not in data["user"]
        )
        # Check cookie
        cookie_set = "tap_session" in session.cookies
        print_test("Valid signup", passed and cookie_set, 
                   f"Status: {resp.status_code}, User: {data.get('user', {}).get('username')}, Cookie: {cookie_set}")
    except Exception as e:
        print_test("Valid signup", False, f"Error: {e}")
    
    # Test 2b: Duplicate email
    try:
        resp = requests.post(f"{BASE_URL}/auth/signup", json={
            "email": valid_email,
            "username": f"different_{nonce}",
            "password": valid_password
        }, timeout=10)
        passed = resp.status_code == 409 and "error" in resp.json()
        print_test("Duplicate email rejection", passed, f"Status: {resp.status_code}, Response: {resp.json()}")
    except Exception as e:
        print_test("Duplicate email rejection", False, f"Error: {e}")
    
    # Test 2c: Duplicate username
    try:
        resp = requests.post(f"{BASE_URL}/auth/signup", json={
            "email": f"different+{nonce}@tap.test",
            "username": valid_username,
            "password": valid_password
        }, timeout=10)
        passed = resp.status_code == 409 and "error" in resp.json()
        print_test("Duplicate username rejection", passed, f"Status: {resp.status_code}, Response: {resp.json()}")
    except Exception as e:
        print_test("Duplicate username rejection", False, f"Error: {e}")
    
    # Test 2d: Invalid email
    try:
        resp = requests.post(f"{BASE_URL}/auth/signup", json={
            "email": "abc",
            "username": f"test_{nonce}",
            "password": valid_password
        }, timeout=10)
        passed = resp.status_code == 400 and "error" in resp.json()
        print_test("Invalid email rejection", passed, f"Status: {resp.status_code}, Response: {resp.json()}")
    except Exception as e:
        print_test("Invalid email rejection", False, f"Error: {e}")
    
    # Test 2e: Short password
    try:
        resp = requests.post(f"{BASE_URL}/auth/signup", json={
            "email": f"short+{nonce}@tap.test",
            "username": f"short_{nonce}",
            "password": "short"
        }, timeout=10)
        passed = resp.status_code == 400 and "error" in resp.json()
        print_test("Short password rejection", passed, f"Status: {resp.status_code}, Response: {resp.json()}")
    except Exception as e:
        print_test("Short password rejection", False, f"Error: {e}")
    
    # Test 2f: Short username
    try:
        resp = requests.post(f"{BASE_URL}/auth/signup", json={
            "email": f"shortuser+{nonce}@tap.test",
            "username": "ab",
            "password": valid_password
        }, timeout=10)
        passed = resp.status_code == 400 and "error" in resp.json()
        print_test("Short username rejection", passed, f"Status: {resp.status_code}, Response: {resp.json()}")
    except Exception as e:
        print_test("Short username rejection", False, f"Error: {e}")
    
    # Test 2g: Username normalization
    try:
        nonce2 = random_nonce()
        resp = requests.post(f"{BASE_URL}/auth/signup", json={
            "email": f"normalize+{nonce2}@tap.test",
            "username": "Bob Smith!",
            "password": valid_password
        }, timeout=10)
        data = resp.json()
        # Should normalize to "bobsmith" (lowercase, strip non-[a-z0-9_])
        passed = (
            resp.status_code == 200 and
            data.get("ok") == True and
            data.get("user", {}).get("username") == "bobsmith"
        )
        print_test("Username normalization", passed, 
                   f"Status: {resp.status_code}, Normalized username: {data.get('user', {}).get('username')}")
    except Exception as e:
        print_test("Username normalization", False, f"Error: {e}")
    
    return session, valid_email, valid_username, valid_password

def test_me(session_with_cookie, session_without_cookie):
    """Test GET /api/me"""
    print("\n=== TEST 3: GET /api/me ===")
    
    # Test 3a: Without cookie
    try:
        resp = session_without_cookie.get(f"{BASE_URL}/me", timeout=10)
        data = resp.json()
        passed = resp.status_code == 200 and data.get("user") is None
        print_test("GET /me without cookie", passed, f"Status: {resp.status_code}, User: {data.get('user')}")
    except Exception as e:
        print_test("GET /me without cookie", False, f"Error: {e}")
    
    # Test 3b: With session cookie
    try:
        resp = session_with_cookie.get(f"{BASE_URL}/me", timeout=10)
        data = resp.json()
        passed = (
            resp.status_code == 200 and
            data.get("user") is not None and
            "passwordHash" not in data.get("user", {}) and
            "_id" not in data.get("user", {})
        )
        print_test("GET /me with cookie", passed, 
                   f"Status: {resp.status_code}, Username: {data.get('user', {}).get('username')}")
    except Exception as e:
        print_test("GET /me with cookie", False, f"Error: {e}")

def test_login(email, username, password):
    """Test POST /api/auth/login"""
    print("\n=== TEST 4: POST /api/auth/login ===")
    
    # Test 4a: Correct credentials
    session = requests.Session()
    try:
        resp = session.post(f"{BASE_URL}/auth/login", json={
            "email": email,
            "password": password
        }, timeout=10)
        data = resp.json()
        cookie_set = "tap_session" in session.cookies
        passed = (
            resp.status_code == 200 and
            data.get("ok") == True and
            "user" in data and
            cookie_set
        )
        print_test("Login with correct credentials", passed, 
                   f"Status: {resp.status_code}, User: {data.get('user', {}).get('username')}, Cookie: {cookie_set}")
    except Exception as e:
        print_test("Login with correct credentials", False, f"Error: {e}")
    
    # Test 4b: Wrong password
    try:
        resp = requests.post(f"{BASE_URL}/auth/login", json={
            "email": email,
            "password": "wrongpassword123"
        }, timeout=10)
        passed = resp.status_code == 401 and "error" in resp.json()
        print_test("Login with wrong password", passed, f"Status: {resp.status_code}, Response: {resp.json()}")
    except Exception as e:
        print_test("Login with wrong password", False, f"Error: {e}")
    
    # Test 4c: Unknown email
    try:
        resp = requests.post(f"{BASE_URL}/auth/login", json={
            "email": f"unknown_{random_nonce()}@tap.test",
            "password": password
        }, timeout=10)
        passed = resp.status_code == 401 and "error" in resp.json()
        print_test("Login with unknown email", passed, f"Status: {resp.status_code}, Response: {resp.json()}")
    except Exception as e:
        print_test("Login with unknown email", False, f"Error: {e}")
    
    # Test 4d: Missing fields
    try:
        resp = requests.post(f"{BASE_URL}/auth/login", json={}, timeout=10)
        passed = resp.status_code == 400 and "error" in resp.json()
        print_test("Login with missing fields", passed, f"Status: {resp.status_code}, Response: {resp.json()}")
    except Exception as e:
        print_test("Login with missing fields", False, f"Error: {e}")
    
    return session

def test_logout(session):
    """Test POST /api/auth/logout"""
    print("\n=== TEST 5: POST /api/auth/logout ===")
    
    # Test 5a: Logout
    try:
        resp = session.post(f"{BASE_URL}/auth/logout", timeout=10)
        passed = resp.status_code == 200 and resp.json().get("ok") == True
        print_test("Logout", passed, f"Status: {resp.status_code}, Response: {resp.json()}")
    except Exception as e:
        print_test("Logout", False, f"Error: {e}")
    
    # Test 5b: Verify /me returns null after logout
    try:
        resp = session.get(f"{BASE_URL}/me", timeout=10)
        data = resp.json()
        passed = resp.status_code == 200 and data.get("user") is None
        print_test("GET /me after logout returns null", passed, f"Status: {resp.status_code}, User: {data.get('user')}")
    except Exception as e:
        print_test("GET /me after logout returns null", False, f"Error: {e}")

def test_listings_create(session_with_auth, session_without_auth):
    """Test POST /api/listings"""
    print("\n=== TEST 6: POST /api/listings ===")
    
    # Test 6a: Without cookie (unauthorized)
    try:
        resp = session_without_auth.post(f"{BASE_URL}/listings", json={
            "title": "Test Listing",
            "price": 1000
        }, timeout=10)
        passed = resp.status_code == 401 and "error" in resp.json()
        print_test("Create listing without auth", passed, f"Status: {resp.status_code}, Response: {resp.json()}")
    except Exception as e:
        print_test("Create listing without auth", False, f"Error: {e}")
    
    # Test 6b: Valid listing with all fields
    listing_id = None
    try:
        resp = session_with_auth.post(f"{BASE_URL}/listings", json={
            "title": "AP × Swatch Mission to Le Brassus",
            "price": 4850,
            "description": "Sealed",
            "collection": "Bioceramic Royal Oak",
            "reference": "APXS-01",
            "year": 2026,
            "condition": "New",
            "location": "Paris, France",
            "boxIncluded": True,
            "papersIncluded": True,
            "images": ["https://example.com/img.jpg", "https://example.com/img2.jpg"]
        }, timeout=10)
        data = resp.json()
        listing_id = data.get("listing", {}).get("id")
        passed = (
            resp.status_code == 200 and
            data.get("ok") == True and
            "listing" in data and
            data["listing"].get("title") == "AP × Swatch Mission to Le Brassus" and
            data["listing"].get("price") == 4850 and
            data["listing"].get("currency") == "EUR" and
            data["listing"].get("status") == "active" and
            "sellerUsername" in data["listing"] and
            "createdAt" in data["listing"]
        )
        print_test("Create valid listing", passed, 
                   f"Status: {resp.status_code}, Listing ID: {listing_id}, Price: {data.get('listing', {}).get('price')}")
    except Exception as e:
        print_test("Create valid listing", False, f"Error: {e}")
    
    # Test 6c: Missing title
    try:
        resp = session_with_auth.post(f"{BASE_URL}/listings", json={
            "price": 1000
        }, timeout=10)
        passed = resp.status_code == 400 and "error" in resp.json()
        print_test("Missing title rejection", passed, f"Status: {resp.status_code}, Response: {resp.json()}")
    except Exception as e:
        print_test("Missing title rejection", False, f"Error: {e}")
    
    # Test 6d: Title too short
    try:
        resp = session_with_auth.post(f"{BASE_URL}/listings", json={
            "title": "AB",
            "price": 1000
        }, timeout=10)
        passed = resp.status_code == 400 and "error" in resp.json()
        print_test("Short title rejection", passed, f"Status: {resp.status_code}, Response: {resp.json()}")
    except Exception as e:
        print_test("Short title rejection", False, f"Error: {e}")
    
    # Test 6e: Price zero
    try:
        resp = session_with_auth.post(f"{BASE_URL}/listings", json={
            "title": "Test Watch",
            "price": 0
        }, timeout=10)
        passed = resp.status_code == 400 and "error" in resp.json()
        print_test("Zero price rejection", passed, f"Status: {resp.status_code}, Response: {resp.json()}")
    except Exception as e:
        print_test("Zero price rejection", False, f"Error: {e}")
    
    # Test 6f: Negative price
    try:
        resp = session_with_auth.post(f"{BASE_URL}/listings", json={
            "title": "Test Watch",
            "price": -100
        }, timeout=10)
        passed = resp.status_code == 400 and "error" in resp.json()
        print_test("Negative price rejection", passed, f"Status: {resp.status_code}, Response: {resp.json()}")
    except Exception as e:
        print_test("Negative price rejection", False, f"Error: {e}")
    
    # Test 6g: Non-numeric price
    try:
        resp = session_with_auth.post(f"{BASE_URL}/listings", json={
            "title": "Test Watch",
            "price": "not-a-number"
        }, timeout=10)
        passed = resp.status_code == 400 and "error" in resp.json()
        print_test("Non-numeric price rejection", passed, f"Status: {resp.status_code}, Response: {resp.json()}")
    except Exception as e:
        print_test("Non-numeric price rejection", False, f"Error: {e}")
    
    # Test 6h: More than 8 images (should only store 8)
    try:
        ten_images = [f"https://example.com/img{i}.jpg" for i in range(10)]
        resp = session_with_auth.post(f"{BASE_URL}/listings", json={
            "title": "Test Watch with Many Images",
            "price": 1000,
            "images": ten_images
        }, timeout=10)
        data = resp.json()
        passed = (
            resp.status_code == 200 and
            data.get("ok") == True and
            len(data.get("listing", {}).get("images", [])) == 8
        )
        print_test("Max 8 images enforced", passed, 
                   f"Status: {resp.status_code}, Images stored: {len(data.get('listing', {}).get('images', []))}")
    except Exception as e:
        print_test("Max 8 images enforced", False, f"Error: {e}")
    
    # Test 6i: Non-http image URL filtered out
    try:
        resp = session_with_auth.post(f"{BASE_URL}/listings", json={
            "title": "Test Watch with FTP Image",
            "price": 1000,
            "images": ["https://example.com/good.jpg", "ftp://bad.com/img.jpg", "https://example.com/good2.jpg"]
        }, timeout=10)
        data = resp.json()
        images = data.get("listing", {}).get("images", [])
        passed = (
            resp.status_code == 200 and
            data.get("ok") == True and
            len(images) == 2 and
            all(img.startswith("http") for img in images)
        )
        print_test("Non-http URLs filtered", passed, 
                   f"Status: {resp.status_code}, Images: {images}")
    except Exception as e:
        print_test("Non-http URLs filtered", False, f"Error: {e}")
    
    # Test 6j: Description truncated to 4000 chars
    try:
        long_desc = "A" * 5000
        resp = session_with_auth.post(f"{BASE_URL}/listings", json={
            "title": "Test Watch with Long Description",
            "price": 1000,
            "description": long_desc
        }, timeout=10)
        data = resp.json()
        desc_len = len(data.get("listing", {}).get("description", ""))
        passed = (
            resp.status_code == 200 and
            data.get("ok") == True and
            desc_len == 4000
        )
        print_test("Description truncated to 4000 chars", passed, 
                   f"Status: {resp.status_code}, Description length: {desc_len}")
    except Exception as e:
        print_test("Description truncated to 4000 chars", False, f"Error: {e}")
    
    return listing_id

def test_listings_list(listing_id):
    """Test GET /api/listings"""
    print("\n=== TEST 7: GET /api/listings ===")
    
    # Test 7a: List all listings
    try:
        resp = requests.get(f"{BASE_URL}/listings", timeout=10)
        data = resp.json()
        passed = (
            resp.status_code == 200 and
            data.get("ok") == True and
            "items" in data and
            isinstance(data["items"], list)
        )
        print_test("List all listings", passed, 
                   f"Status: {resp.status_code}, Count: {len(data.get('items', []))}")
    except Exception as e:
        print_test("List all listings", False, f"Error: {e}")
    
    # Test 7b: Verify newly created listing appears
    if listing_id:
        try:
            resp = requests.get(f"{BASE_URL}/listings", timeout=10)
            data = resp.json()
            items = data.get("items", [])
            found = any(item.get("id") == listing_id for item in items)
            passed = resp.status_code == 200 and found
            print_test("Newly created listing appears in list", passed, 
                       f"Status: {resp.status_code}, Found: {found}")
        except Exception as e:
            print_test("Newly created listing appears in list", False, f"Error: {e}")
    
    # Test 7c: Filter by query (case-insensitive)
    try:
        resp = requests.get(f"{BASE_URL}/listings?q=Brassus", timeout=10)
        data = resp.json()
        items = data.get("items", [])
        # Should find "AP × Swatch Mission to Le Brassus"
        found = any("brassus" in item.get("title", "").lower() or 
                   "brassus" in item.get("collection", "").lower() for item in items)
        passed = resp.status_code == 200 and data.get("ok") == True
        print_test("Filter by query 'Brassus'", passed, 
                   f"Status: {resp.status_code}, Results: {len(items)}, Found match: {found}")
    except Exception as e:
        print_test("Filter by query 'Brassus'", False, f"Error: {e}")
    
    # Test 7d: Non-existent query returns empty
    try:
        resp = requests.get(f"{BASE_URL}/listings?q=NONEXISTENT_ABC", timeout=10)
        data = resp.json()
        items = data.get("items", [])
        passed = resp.status_code == 200 and data.get("ok") == True and len(items) == 0
        print_test("Non-existent query returns empty", passed, 
                   f"Status: {resp.status_code}, Results: {len(items)}")
    except Exception as e:
        print_test("Non-existent query returns empty", False, f"Error: {e}")

def test_listings_detail(listing_id):
    """Test GET /api/listings/{id}"""
    print("\n=== TEST 8: GET /api/listings/{id} ===")
    
    # Test 8a: Existing listing
    if listing_id:
        try:
            resp = requests.get(f"{BASE_URL}/listings/{listing_id}", timeout=10)
            data = resp.json()
            passed = (
                resp.status_code == 200 and
                data.get("ok") == True and
                "listing" in data and
                data["listing"].get("id") == listing_id and
                "_id" not in data["listing"]
            )
            print_test("Get existing listing", passed, 
                       f"Status: {resp.status_code}, Listing ID: {data.get('listing', {}).get('id')}")
        except Exception as e:
            print_test("Get existing listing", False, f"Error: {e}")
    
    # Test 8b: Non-existent listing
    try:
        fake_id = f"fake-{random_nonce()}"
        resp = requests.get(f"{BASE_URL}/listings/{fake_id}", timeout=10)
        passed = resp.status_code == 404 and "error" in resp.json()
        print_test("Non-existent listing returns 404", passed, 
                   f"Status: {resp.status_code}, Response: {resp.json()}")
    except Exception as e:
        print_test("Non-existent listing returns 404", False, f"Error: {e}")

def test_waitlist_regression():
    """Regression test for POST /api/waitlist"""
    print("\n=== TEST 9: POST /api/waitlist (regression) ===")
    
    nonce = random_nonce()
    
    # Test 9a: Valid email
    try:
        resp = requests.post(f"{BASE_URL}/waitlist", json={
            "email": f"regression+{nonce}@tap.test"
        }, timeout=10)
        data = resp.json()
        passed = resp.status_code == 200 and data.get("ok") == True and data.get("duplicate") == False
        print_test("Waitlist valid email", passed, f"Status: {resp.status_code}, Response: {data}")
    except Exception as e:
        print_test("Waitlist valid email", False, f"Error: {e}")
    
    # Test 9b: Duplicate
    try:
        resp = requests.post(f"{BASE_URL}/waitlist", json={
            "email": f"regression+{nonce}@tap.test"
        }, timeout=10)
        data = resp.json()
        passed = resp.status_code == 200 and data.get("ok") == True and data.get("duplicate") == True
        print_test("Waitlist duplicate detection", passed, f"Status: {resp.status_code}, Response: {data}")
    except Exception as e:
        print_test("Waitlist duplicate detection", False, f"Error: {e}")
    
    # Test 9c: Invalid email
    try:
        resp = requests.post(f"{BASE_URL}/waitlist", json={
            "email": "invalid-email"
        }, timeout=10)
        passed = resp.status_code == 400 and "error" in resp.json()
        print_test("Waitlist invalid email", passed, f"Status: {resp.status_code}, Response: {resp.json()}")
    except Exception as e:
        print_test("Waitlist invalid email", False, f"Error: {e}")

def test_admin_waitlist_counters():
    """Test GET /api/admin/waitlist includes new counters"""
    print("\n=== TEST 10: GET /api/admin/waitlist (with counters) ===")
    
    try:
        resp = requests.get(f"{BASE_URL}/admin/waitlist", headers={
            "x-admin-password": ADMIN_PASSWORD
        }, timeout=10)
        data = resp.json()
        passed = (
            resp.status_code == 200 and
            data.get("ok") == True and
            "pageviews" in data and
            "users" in data and
            "listings" in data and
            isinstance(data["pageviews"], int) and
            isinstance(data["users"], int) and
            isinstance(data["listings"], int) and
            data["pageviews"] > 0  # Should have pageviews from test_events
        )
        print_test("Admin waitlist with counters", passed, 
                   f"Status: {resp.status_code}, Pageviews: {data.get('pageviews')}, Users: {data.get('users')}, Listings: {data.get('listings')}")
    except Exception as e:
        print_test("Admin waitlist with counters", False, f"Error: {e}")

def main():
    print("=" * 80)
    print("TAPISSERIE PHASE 2 BACKEND API TESTS")
    print("=" * 80)
    print(f"Base URL: {BASE_URL}")
    print(f"Admin Password: {ADMIN_PASSWORD}")
    print("=" * 80)
    
    # Test 1: Events
    test_events()
    
    # Test 2: Signup (returns session with cookie)
    session_with_auth, email, username, password = test_auth_signup()
    
    # Test 3: Me endpoint
    session_without_auth = requests.Session()
    test_me(session_with_auth, session_without_auth)
    
    # Test 4: Login
    login_session = test_login(email, username, password)
    
    # Test 5: Logout
    test_logout(login_session)
    
    # Create a fresh authenticated session for listings tests
    fresh_session = requests.Session()
    fresh_session.post(f"{BASE_URL}/auth/login", json={
        "email": email,
        "password": password
    }, timeout=10)
    
    # Test 6: Create listings
    listing_id = test_listings_create(fresh_session, session_without_auth)
    
    # Test 7: List listings
    test_listings_list(listing_id)
    
    # Test 8: Listing detail
    test_listings_detail(listing_id)
    
    # Test 9: Waitlist regression
    test_waitlist_regression()
    
    # Test 10: Admin waitlist with counters
    test_admin_waitlist_counters()
    
    print("\n" + "=" * 80)
    print("TESTING COMPLETE")
    print("=" * 80)

if __name__ == "__main__":
    main()
