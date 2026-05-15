#!/usr/bin/env python3
"""
Backend API tests for TAPISSERIE Phase 2
Tests all new endpoints: upload, shipping, user profiles, conversations, messages, offers
"""
import requests
import json
import io
from PIL import Image
import time

BASE_URL = "https://chronoluxe-trade.preview.emergentagent.com/api"

def create_test_image():
    """Create a small test PNG image in memory"""
    img = Image.new('RGB', (100, 100), color='red')
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    buf.seek(0)
    return buf

def create_test_txt_file():
    """Create a test text file"""
    return io.BytesIO(b"This is a text file, not an image")

print("=" * 80)
print("TAPISSERIE PHASE 2 BACKEND TESTS")
print("=" * 80)

# ============================================================================
# TEST 1: IMAGE UPLOAD ENDPOINT
# ============================================================================
print("\n" + "=" * 80)
print("TEST 1: POST /api/upload (Image Upload)")
print("=" * 80)

# Test 1a: Upload without auth -> 401
print("\n[1a] Upload without auth cookie -> expect 401")
try:
    img_buf = create_test_image()
    files = {'files': ('test.png', img_buf, 'image/png')}
    r = requests.post(f"{BASE_URL}/upload", files=files)
    print(f"Status: {r.status_code}")
    print(f"Response: {r.json()}")
    if r.status_code == 401:
        print("✅ PASS: Unauthorized access blocked")
    else:
        print(f"❌ FAIL: Expected 401, got {r.status_code}")
except Exception as e:
    print(f"❌ FAIL: {e}")

# Create a test user for authenticated upload tests
print("\n[Setup] Creating test user for upload tests...")
test_user_upload = {
    "email": f"uploader_{int(time.time())}@tapisserie.test",
    "username": f"uploader{int(time.time())}",
    "password": "testpass123"
}
try:
    r = requests.post(f"{BASE_URL}/auth/signup", json=test_user_upload)
    if r.status_code == 200:
        upload_cookie = r.cookies.get('tap_session')
        print(f"✅ Test user created: {test_user_upload['username']}")
    else:
        print(f"❌ Failed to create test user: {r.status_code} {r.text}")
        upload_cookie = None
except Exception as e:
    print(f"❌ Failed to create test user: {e}")
    upload_cookie = None

if upload_cookie:
    # Test 1b: Upload non-image file -> 400
    print("\n[1b] Upload .txt file (not image) with auth -> expect 400")
    try:
        txt_buf = create_test_txt_file()
        files = {'files': ('test.txt', txt_buf, 'text/plain')}
        cookies = {'tap_session': upload_cookie}
        r = requests.post(f"{BASE_URL}/upload", files=files, cookies=cookies)
        print(f"Status: {r.status_code}")
        print(f"Response: {r.json()}")
        if r.status_code == 400 and 'is not an image' in r.json().get('error', ''):
            print("✅ PASS: Non-image file rejected with correct error message")
        else:
            print(f"❌ FAIL: Expected 400 with 'is not an image' error")
    except Exception as e:
        print(f"❌ FAIL: {e}")

    # Test 1c: Upload valid image -> 200 with URLs
    print("\n[1c] Upload valid PNG image with auth -> expect 200 with URLs")
    try:
        img_buf = create_test_image()
        files = {'files': ('test.png', img_buf, 'image/png')}
        cookies = {'tap_session': upload_cookie}
        r = requests.post(f"{BASE_URL}/upload", files=files, cookies=cookies)
        print(f"Status: {r.status_code}")
        resp = r.json()
        print(f"Response: {resp}")
        if r.status_code == 200 and resp.get('ok') and 'urls' in resp and len(resp['urls']) == 1:
            uploaded_url = resp['urls'][0]
            print(f"✅ PASS: Image uploaded successfully, URL: {uploaded_url}")
            
            # Test 1d: Verify uploaded image is accessible
            print("\n[1d] Verify uploaded image URL is accessible")
            # Note: uploaded URL is /uploads/xxx.png, need to fetch from base domain (not /api)
            full_url = f"https://chronoluxe-trade.preview.emergentagent.com{uploaded_url}"
            r2 = requests.get(full_url)
            print(f"GET {full_url}")
            print(f"Status: {r2.status_code}")
            if r2.status_code == 200:
                print(f"✅ PASS: Uploaded image is accessible (Content-Length: {len(r2.content)} bytes)")
            else:
                print(f"❌ FAIL: Uploaded image not accessible, status {r2.status_code}")
        else:
            print(f"❌ FAIL: Expected 200 with ok:true and urls array")
    except Exception as e:
        print(f"❌ FAIL: {e}")

    # Test 1e: Upload 0 files -> 400
    print("\n[1e] Upload 0 files -> expect 400")
    try:
        cookies = {'tap_session': upload_cookie}
        r = requests.post(f"{BASE_URL}/upload", files={}, cookies=cookies)
        print(f"Status: {r.status_code}")
        print(f"Response: {r.json()}")
        if r.status_code == 400:
            print("✅ PASS: Empty upload rejected")
        else:
            print(f"❌ FAIL: Expected 400, got {r.status_code}")
    except Exception as e:
        print(f"❌ FAIL: {e}")

    # Test 1f: Upload >8 files -> 400
    print("\n[1f] Upload 9 files (>8 max) -> expect 400")
    try:
        files = []
        for i in range(9):
            img_buf = create_test_image()
            files.append(('files', (f'test{i}.png', img_buf, 'image/png')))
        cookies = {'tap_session': upload_cookie}
        r = requests.post(f"{BASE_URL}/upload", files=files, cookies=cookies)
        print(f"Status: {r.status_code}")
        print(f"Response: {r.json()}")
        if r.status_code == 400 and 'max' in r.json().get('error', '').lower():
            print("✅ PASS: >8 files rejected with max limit error")
        else:
            print(f"❌ FAIL: Expected 400 with max limit error")
    except Exception as e:
        print(f"❌ FAIL: {e}")

# ============================================================================
# TEST 2: SHIPPING ESTIMATE ENDPOINT
# ============================================================================
print("\n" + "=" * 80)
print("TEST 2: POST /api/shipping/estimate")
print("=" * 80)

# Test 2a: Missing from/to -> 400
print("\n[2a] Missing 'from' field -> expect 400")
try:
    r = requests.post(f"{BASE_URL}/shipping/estimate", json={"to": "Berlin, Germany"})
    print(f"Status: {r.status_code}")
    print(f"Response: {r.json()}")
    if r.status_code == 400:
        print("✅ PASS: Missing 'from' rejected")
    else:
        print(f"❌ FAIL: Expected 400, got {r.status_code}")
except Exception as e:
    print(f"❌ FAIL: {e}")

# Test 2b: Valid locations -> 200 with distance and cost
print("\n[2b] Valid locations (Paris -> Berlin) -> expect 200 with distance ~870-880km")
try:
    r = requests.post(f"{BASE_URL}/shipping/estimate", json={
        "from": "Paris, France",
        "to": "Berlin, Germany"
    })
    print(f"Status: {r.status_code}")
    resp = r.json()
    print(f"Response: {json.dumps(resp, indent=2)}")
    if r.status_code == 200 and resp.get('ok'):
        dist = resp.get('distanceKm')
        cost = resp.get('costEUR')
        eta = resp.get('eta')
        from_label = resp.get('from')
        to_label = resp.get('to')
        print(f"Distance: {dist} km")
        print(f"Cost: €{cost}")
        print(f"ETA: {eta}")
        print(f"From: {from_label}")
        print(f"To: {to_label}")
        if 850 <= dist <= 900 and cost > 0 and eta and from_label and to_label:
            print("✅ PASS: Valid shipping estimate returned")
        else:
            print(f"❌ FAIL: Distance {dist} not in expected range 850-900km or missing fields")
    else:
        print(f"❌ FAIL: Expected 200 with ok:true")
except Exception as e:
    print(f"❌ FAIL: {e}")

# Test 2c: Garbage location -> 422
print("\n[2c] Garbage location -> expect 422")
try:
    # Add small delay to avoid rate limiting from Nominatim
    time.sleep(1)
    r = requests.post(f"{BASE_URL}/shipping/estimate", json={
        "from": "qqqqqqqq XXXX invalid",
        "to": "Berlin, Germany"
    })
    print(f"Status: {r.status_code}")
    print(f"Response: {r.json()}")
    if r.status_code == 422:
        print("✅ PASS: Invalid location rejected with 422")
    else:
        print(f"❌ FAIL: Expected 422, got {r.status_code}")
except Exception as e:
    print(f"❌ FAIL: {e}")

# ============================================================================
# TEST 3: USER PROFILE ENDPOINT
# ============================================================================
print("\n" + "=" * 80)
print("TEST 3: GET /api/users/:username")
print("=" * 80)

# Test 3a: Unknown username -> 404
print("\n[3a] Unknown username -> expect 404")
try:
    r = requests.get(f"{BASE_URL}/users/nonexistent_user_xyz_123")
    print(f"Status: {r.status_code}")
    print(f"Response: {r.json()}")
    if r.status_code == 404:
        print("✅ PASS: Unknown user returns 404")
    else:
        print(f"❌ FAIL: Expected 404, got {r.status_code}")
except Exception as e:
    print(f"❌ FAIL: {e}")

# Test 3b: Existing user -> 200 with user, listings, stats (no email/passwordHash)
print("\n[3b] Existing user profile -> expect 200 with sanitized data")
if upload_cookie:
    try:
        username = test_user_upload['username']
        r = requests.get(f"{BASE_URL}/users/{username}")
        print(f"Status: {r.status_code}")
        resp = r.json()
        print(f"Response: {json.dumps(resp, indent=2)}")
        if r.status_code == 200 and resp.get('ok'):
            user = resp.get('user', {})
            listings = resp.get('listings', [])
            stats = resp.get('stats', {})
            has_email = 'email' in user
            has_password = 'passwordHash' in user
            has_username = 'username' in user
            has_stats = 'active' in stats and 'sold' in stats and 'rating' in stats
            print(f"User has username: {has_username}")
            print(f"User has email (should be False): {has_email}")
            print(f"User has passwordHash (should be False): {has_password}")
            print(f"Stats present: {has_stats}")
            if has_username and not has_email and not has_password and has_stats:
                print("✅ PASS: User profile returned without sensitive data")
            else:
                print(f"❌ FAIL: User profile contains sensitive data or missing required fields")
        else:
            print(f"❌ FAIL: Expected 200 with ok:true")
    except Exception as e:
        print(f"❌ FAIL: {e}")

# ============================================================================
# TEST 4: UPDATE PROFILE ENDPOINT (PUT /api/me)
# ============================================================================
print("\n" + "=" * 80)
print("TEST 4: PUT /api/me")
print("=" * 80)

# Test 4a: Without auth -> 401
print("\n[4a] Update profile without auth -> expect 401")
try:
    r = requests.put(f"{BASE_URL}/me", json={"bio": "test bio"})
    print(f"Status: {r.status_code}")
    print(f"Response: {r.json()}")
    if r.status_code == 401:
        print("✅ PASS: Unauthorized update blocked")
    else:
        print(f"❌ FAIL: Expected 401, got {r.status_code}")
except Exception as e:
    print(f"❌ FAIL: {e}")

if upload_cookie:
    # Test 4b: Valid update with bio, location, avatarUrl -> 200
    print("\n[4b] Valid profile update -> expect 200")
    try:
        cookies = {'tap_session': upload_cookie}
        update_data = {
            "bio": "watch nerd, geneva",
            "location": "Geneva, Switzerland",
            "avatarUrl": "https://example.com/me.jpg"
        }
        r = requests.put(f"{BASE_URL}/me", json=update_data, cookies=cookies)
        print(f"Status: {r.status_code}")
        resp = r.json()
        print(f"Response: {json.dumps(resp, indent=2)}")
        if r.status_code == 200 and resp.get('ok'):
            user = resp.get('user', {})
            if user.get('bio') == update_data['bio'] and user.get('location') == update_data['location'] and user.get('avatarUrl') == update_data['avatarUrl']:
                print("✅ PASS: Profile updated successfully")
            else:
                print(f"❌ FAIL: Profile not updated correctly")
        else:
            print(f"❌ FAIL: Expected 200 with ok:true")
    except Exception as e:
        print(f"❌ FAIL: {e}")

    # Test 4c: Bio >500 chars -> truncated to 500
    print("\n[4c] Bio >500 chars -> expect truncation to 500")
    try:
        cookies = {'tap_session': upload_cookie}
        long_bio = "x" * 600
        r = requests.put(f"{BASE_URL}/me", json={"bio": long_bio}, cookies=cookies)
        print(f"Status: {r.status_code}")
        resp = r.json()
        if r.status_code == 200 and resp.get('ok'):
            user = resp.get('user', {})
            bio_len = len(user.get('bio', ''))
            print(f"Stored bio length: {bio_len}")
            if bio_len == 500:
                print("✅ PASS: Bio truncated to 500 chars")
            else:
                print(f"❌ FAIL: Bio length is {bio_len}, expected 500")
        else:
            print(f"❌ FAIL: Expected 200 with ok:true")
    except Exception as e:
        print(f"❌ FAIL: {e}")

    # Test 4d: Invalid avatarUrl (ftp://) -> should not be set
    print("\n[4d] Invalid avatarUrl (ftp://) -> expect validation")
    try:
        cookies = {'tap_session': upload_cookie}
        # First set a valid URL
        r1 = requests.put(f"{BASE_URL}/me", json={"avatarUrl": "https://valid.com/img.jpg"}, cookies=cookies)
        valid_url = r1.json().get('user', {}).get('avatarUrl')
        print(f"Set valid URL: {valid_url}")
        
        # Try to set invalid URL
        r2 = requests.put(f"{BASE_URL}/me", json={"avatarUrl": "ftp://bad.com/file"}, cookies=cookies)
        print(f"Status: {r2.status_code}")
        resp = r2.json()
        print(f"Response: {json.dumps(resp, indent=2)}")
        
        # Check if avatarUrl was NOT updated (should still be the valid one or not set)
        new_url = resp.get('user', {}).get('avatarUrl')
        if new_url != "ftp://bad.com/file":
            print(f"✅ PASS: Invalid avatarUrl rejected (current: {new_url})")
        else:
            print(f"❌ FAIL: Invalid avatarUrl was accepted")
    except Exception as e:
        print(f"❌ FAIL: {e}")

    # Test 4e: Empty body -> 400
    print("\n[4e] Empty update body -> expect 400")
    try:
        cookies = {'tap_session': upload_cookie}
        r = requests.put(f"{BASE_URL}/me", json={}, cookies=cookies)
        print(f"Status: {r.status_code}")
        print(f"Response: {r.json()}")
        if r.status_code == 400:
            print("✅ PASS: Empty update rejected")
        else:
            print(f"❌ FAIL: Expected 400, got {r.status_code}")
    except Exception as e:
        print(f"❌ FAIL: {e}")

# ============================================================================
# TEST 5: CONVERSATIONS AND MESSAGES FLOW
# ============================================================================
print("\n" + "=" * 80)
print("TEST 5: CONVERSATIONS AND MESSAGES (Full Flow)")
print("=" * 80)

# Setup: Create two users (seller and buyer)
print("\n[Setup] Creating seller and buyer users...")
timestamp = int(time.time())
seller_data = {
    "email": f"seller_{timestamp}@tapisserie.test",
    "username": f"seller{timestamp}",
    "password": "testpass123"
}
buyer_data = {
    "email": f"buyer_{timestamp}@tapisserie.test",
    "username": f"buyer{timestamp}",
    "password": "testpass123"
}

try:
    r_seller = requests.post(f"{BASE_URL}/auth/signup", json=seller_data)
    seller_cookie = r_seller.cookies.get('tap_session')
    print(f"✅ Seller created: {seller_data['username']}")
    
    r_buyer = requests.post(f"{BASE_URL}/auth/signup", json=buyer_data)
    buyer_cookie = r_buyer.cookies.get('tap_session')
    print(f"✅ Buyer created: {buyer_data['username']}")
except Exception as e:
    print(f"❌ Failed to create test users: {e}")
    seller_cookie = None
    buyer_cookie = None

if seller_cookie and buyer_cookie:
    # Create a listing as seller
    print("\n[Setup] Creating listing as seller...")
    try:
        listing_data = {
            "title": "Audemars Piguet Royal Oak Offshore",
            "price": 5000,
            "description": "Test listing for conversation flow",
            "brand": "AP × Swatch",
            "collection": "Royal Oak",
            "condition": "New"
        }
        cookies = {'tap_session': seller_cookie}
        r = requests.post(f"{BASE_URL}/listings", json=listing_data, cookies=cookies)
        listing_id = r.json().get('listing', {}).get('id')
        print(f"✅ Listing created: {listing_id}")
    except Exception as e:
        print(f"❌ Failed to create listing: {e}")
        listing_id = None

    if listing_id:
        # Test 5a: Create conversation as buyer -> 200
        print("\n[5a] Buyer creates conversation -> expect 200")
        try:
            cookies = {'tap_session': buyer_cookie}
            r = requests.post(f"{BASE_URL}/conversations", json={"listingId": listing_id}, cookies=cookies)
            print(f"Status: {r.status_code}")
            resp = r.json()
            print(f"Response: {json.dumps(resp, indent=2)}")
            if r.status_code == 200 and resp.get('ok'):
                convo = resp.get('conversation', {})
                convo_id = convo.get('id')
                print(f"Conversation ID: {convo_id}")
                print(f"Participants: {convo.get('participants')}")
                print(f"Listing title: {convo.get('listingTitle')}")
                if convo_id and len(convo.get('participants', [])) == 2:
                    print("✅ PASS: Conversation created successfully")
                else:
                    print(f"❌ FAIL: Conversation missing required fields")
            else:
                print(f"❌ FAIL: Expected 200 with ok:true")
        except Exception as e:
            print(f"❌ FAIL: {e}")
            convo_id = None

        # Test 5b: Create same conversation again -> idempotent (same ID)
        print("\n[5b] Buyer creates same conversation again -> expect same ID (idempotent)")
        try:
            cookies = {'tap_session': buyer_cookie}
            r = requests.post(f"{BASE_URL}/conversations", json={"listingId": listing_id}, cookies=cookies)
            print(f"Status: {r.status_code}")
            resp = r.json()
            new_convo_id = resp.get('conversation', {}).get('id')
            print(f"New conversation ID: {new_convo_id}")
            if new_convo_id == convo_id:
                print("✅ PASS: Idempotent - same conversation returned")
            else:
                print(f"❌ FAIL: Different conversation ID returned")
        except Exception as e:
            print(f"❌ FAIL: {e}")

        # Test 5c: Seller tries to create conversation on own listing -> 400
        print("\n[5c] Seller creates conversation on own listing -> expect 400")
        try:
            cookies = {'tap_session': seller_cookie}
            r = requests.post(f"{BASE_URL}/conversations", json={"listingId": listing_id}, cookies=cookies)
            print(f"Status: {r.status_code}")
            print(f"Response: {r.json()}")
            if r.status_code == 400 and "own listing" in r.json().get('error', '').lower():
                print("✅ PASS: Seller blocked from creating conversation on own listing")
            else:
                print(f"❌ FAIL: Expected 400 with 'own listing' error")
        except Exception as e:
            print(f"❌ FAIL: {e}")

        # Test 5d: GET /api/conversations as buyer -> includes conversation
        print("\n[5d] Buyer lists conversations -> expect to see the conversation")
        try:
            cookies = {'tap_session': buyer_cookie}
            r = requests.get(f"{BASE_URL}/conversations", cookies=cookies)
            print(f"Status: {r.status_code}")
            resp = r.json()
            items = resp.get('items', [])
            print(f"Found {len(items)} conversation(s)")
            found = any(c.get('id') == convo_id for c in items)
            if r.status_code == 200 and found:
                print("✅ PASS: Conversation appears in buyer's list")
            else:
                print(f"❌ FAIL: Conversation not found in list")
        except Exception as e:
            print(f"❌ FAIL: {e}")

        # Test 5e: GET /api/conversations without auth -> 401
        print("\n[5e] List conversations without auth -> expect 401")
        try:
            r = requests.get(f"{BASE_URL}/conversations")
            print(f"Status: {r.status_code}")
            if r.status_code == 401:
                print("✅ PASS: Unauthorized access blocked")
            else:
                print(f"❌ FAIL: Expected 401, got {r.status_code}")
        except Exception as e:
            print(f"❌ FAIL: {e}")

        if convo_id:
            # Test 5f: GET /api/conversations/:id as buyer -> 200 with messages:[]
            print("\n[5f] Buyer gets conversation detail -> expect 200 with empty messages")
            try:
                cookies = {'tap_session': buyer_cookie}
                r = requests.get(f"{BASE_URL}/conversations/{convo_id}", cookies=cookies)
                print(f"Status: {r.status_code}")
                resp = r.json()
                messages = resp.get('messages', [])
                print(f"Messages count: {len(messages)}")
                if r.status_code == 200 and isinstance(messages, list):
                    print("✅ PASS: Conversation detail retrieved")
                else:
                    print(f"❌ FAIL: Expected 200 with messages array")
            except Exception as e:
                print(f"❌ FAIL: {e}")

            # Test 5g: GET /api/conversations/:id without auth -> 401
            print("\n[5g] Get conversation without auth -> expect 401")
            try:
                r = requests.get(f"{BASE_URL}/conversations/{convo_id}")
                print(f"Status: {r.status_code}")
                if r.status_code == 401:
                    print("✅ PASS: Unauthorized access blocked")
                else:
                    print(f"❌ FAIL: Expected 401, got {r.status_code}")
            except Exception as e:
                print(f"❌ FAIL: {e}")

            # Test 5h: Create third user and try to access conversation -> 403
            print("\n[5h] Non-participant tries to access conversation -> expect 403")
            try:
                third_user = {
                    "email": f"third_{timestamp}@tapisserie.test",
                    "username": f"third{timestamp}",
                    "password": "testpass123"
                }
                r_third = requests.post(f"{BASE_URL}/auth/signup", json=third_user)
                third_cookie = r_third.cookies.get('tap_session')
                print(f"✅ Third user created: {third_user['username']}")
                
                cookies = {'tap_session': third_cookie}
                r = requests.get(f"{BASE_URL}/conversations/{convo_id}", cookies=cookies)
                print(f"Status: {r.status_code}")
                if r.status_code == 403:
                    print("✅ PASS: Non-participant blocked with 403")
                else:
                    print(f"❌ FAIL: Expected 403, got {r.status_code}")
            except Exception as e:
                print(f"❌ FAIL: {e}")

            # Test 5i: Buyer sends text message -> 200
            print("\n[5i] Buyer sends text message -> expect 200")
            try:
                cookies = {'tap_session': buyer_cookie}
                msg_data = {"type": "text", "text": "Hello, is this still available?"}
                r = requests.post(f"{BASE_URL}/conversations/{convo_id}/messages", json=msg_data, cookies=cookies)
                print(f"Status: {r.status_code}")
                resp = r.json()
                print(f"Response: {json.dumps(resp, indent=2)}")
                if r.status_code == 200 and resp.get('ok'):
                    text_msg_id = resp.get('message', {}).get('id')
                    text_msg_time = resp.get('message', {}).get('createdAt')
                    print(f"✅ PASS: Text message sent, ID: {text_msg_id}")
                else:
                    print(f"❌ FAIL: Expected 200 with ok:true")
            except Exception as e:
                print(f"❌ FAIL: {e}")
                text_msg_time = None

            # Test 5j: Buyer sends offer message -> 200
            print("\n[5j] Buyer sends offer (€4200) -> expect 200 with offerStatus:pending")
            try:
                cookies = {'tap_session': buyer_cookie}
                offer_data = {"type": "offer", "price": 4200}
                r = requests.post(f"{BASE_URL}/conversations/{convo_id}/messages", json=offer_data, cookies=cookies)
                print(f"Status: {r.status_code}")
                resp = r.json()
                print(f"Response: {json.dumps(resp, indent=2)}")
                if r.status_code == 200 and resp.get('ok'):
                    offer_msg = resp.get('message', {})
                    offer_msg_id = offer_msg.get('id')
                    offer_status = offer_msg.get('offerStatus')
                    print(f"Offer ID: {offer_msg_id}")
                    print(f"Offer status: {offer_status}")
                    if offer_status == 'pending':
                        print("✅ PASS: Offer sent with pending status")
                    else:
                        print(f"❌ FAIL: Expected offerStatus:pending, got {offer_status}")
                else:
                    print(f"❌ FAIL: Expected 200 with ok:true")
            except Exception as e:
                print(f"❌ FAIL: {e}")
                offer_msg_id = None

            # Test 5k: Seller gets conversation -> sees 2 messages
            print("\n[5k] Seller gets conversation -> expect 2 messages in order")
            try:
                cookies = {'tap_session': seller_cookie}
                r = requests.get(f"{BASE_URL}/conversations/{convo_id}", cookies=cookies)
                print(f"Status: {r.status_code}")
                resp = r.json()
                messages = resp.get('messages', [])
                convo_data = resp.get('conversation', {})
                last_msg = convo_data.get('lastMessage')
                print(f"Messages count: {len(messages)}")
                print(f"Last message: {last_msg}")
                if len(messages) == 2 and last_msg and last_msg.get('type') == 'offer':
                    print("✅ PASS: Seller sees both messages, lastMessage reflects offer")
                else:
                    print(f"❌ FAIL: Expected 2 messages with lastMessage type:offer")
            except Exception as e:
                print(f"❌ FAIL: {e}")

            # Test 5l: Seller gets conversation with ?since filter -> only offer message
            if text_msg_time:
                print("\n[5l] Seller gets conversation with ?since filter -> expect only offer message")
                try:
                    cookies = {'tap_session': seller_cookie}
                    r = requests.get(f"{BASE_URL}/conversations/{convo_id}?since={text_msg_time}", cookies=cookies)
                    print(f"Status: {r.status_code}")
                    resp = r.json()
                    messages = resp.get('messages', [])
                    print(f"Messages count after filter: {len(messages)}")
                    if len(messages) == 1 and messages[0].get('type') == 'offer':
                        print("✅ PASS: ?since filter works correctly")
                    else:
                        print(f"❌ FAIL: Expected 1 offer message after filter")
                except Exception as e:
                    print(f"❌ FAIL: {e}")

            # ============================================================================
            # TEST 6: OFFER ACTIONS
            # ============================================================================
            print("\n" + "=" * 80)
            print("TEST 6: OFFER ACTIONS")
            print("=" * 80)

            if offer_msg_id:
                # Test 6a: Buyer (sender) tries to respond to own offer -> 400
                print("\n[6a] Buyer responds to own offer -> expect 400")
                try:
                    cookies = {'tap_session': buyer_cookie}
                    r = requests.post(f"{BASE_URL}/messages/{offer_msg_id}/offer-action", 
                                    json={"action": "accept"}, cookies=cookies)
                    print(f"Status: {r.status_code}")
                    print(f"Response: {r.json()}")
                    if r.status_code == 400 and "own offer" in r.json().get('error', '').lower():
                        print("✅ PASS: Sender blocked from responding to own offer")
                    else:
                        print(f"❌ FAIL: Expected 400 with 'own offer' error")
                except Exception as e:
                    print(f"❌ FAIL: {e}")

                # Create a second offer for accept test
                print("\n[Setup] Creating second offer for accept test...")
                try:
                    cookies = {'tap_session': buyer_cookie}
                    r = requests.post(f"{BASE_URL}/conversations/{convo_id}/messages", 
                                    json={"type": "offer", "price": 4300}, cookies=cookies)
                    offer2_id = r.json().get('message', {}).get('id')
                    print(f"✅ Second offer created: {offer2_id}")
                except Exception as e:
                    print(f"❌ Failed to create second offer: {e}")
                    offer2_id = None

                # Test 6b: Seller accepts offer -> 200, status becomes 'accepted', system message
                if offer2_id:
                    print("\n[6b] Seller accepts offer -> expect 200 with status:accepted + system message")
                    try:
                        cookies = {'tap_session': seller_cookie}
                        r = requests.post(f"{BASE_URL}/messages/{offer2_id}/offer-action", 
                                        json={"action": "accept"}, cookies=cookies)
                        print(f"Status: {r.status_code}")
                        resp = r.json()
                        print(f"Response: {json.dumps(resp, indent=2)}")
                        if r.status_code == 200 and resp.get('ok'):
                            offer_status = resp.get('offer', {}).get('offerStatus')
                            print(f"Offer status: {offer_status}")
                            if offer_status == 'accepted':
                                print("✅ PASS: Offer accepted successfully")
                                
                                # Verify system message was created
                                r2 = requests.get(f"{BASE_URL}/conversations/{convo_id}", cookies=cookies)
                                messages = r2.json().get('messages', [])
                                system_msgs = [m for m in messages if m.get('type') == 'system']
                                if system_msgs:
                                    print(f"✅ System message created: {system_msgs[-1].get('text')}")
                                else:
                                    print("⚠️ No system message found")
                            else:
                                print(f"❌ FAIL: Expected offerStatus:accepted, got {offer_status}")
                        else:
                            print(f"❌ FAIL: Expected 200 with ok:true")
                    except Exception as e:
                        print(f"❌ FAIL: {e}")

                # Create a third offer for reject test
                print("\n[Setup] Creating third offer for reject test...")
                try:
                    cookies = {'tap_session': buyer_cookie}
                    r = requests.post(f"{BASE_URL}/conversations/{convo_id}/messages", 
                                    json={"type": "offer", "price": 4400}, cookies=cookies)
                    offer3_id = r.json().get('message', {}).get('id')
                    print(f"✅ Third offer created: {offer3_id}")
                except Exception as e:
                    print(f"❌ Failed to create third offer: {e}")
                    offer3_id = None

                # Test 6c: Seller rejects offer -> 200, status becomes 'rejected', system message
                if offer3_id:
                    print("\n[6c] Seller rejects offer -> expect 200 with status:rejected + system message")
                    try:
                        cookies = {'tap_session': seller_cookie}
                        r = requests.post(f"{BASE_URL}/messages/{offer3_id}/offer-action", 
                                        json={"action": "reject"}, cookies=cookies)
                        print(f"Status: {r.status_code}")
                        resp = r.json()
                        print(f"Response: {json.dumps(resp, indent=2)}")
                        if r.status_code == 200 and resp.get('ok'):
                            offer_status = resp.get('offer', {}).get('offerStatus')
                            print(f"Offer status: {offer_status}")
                            if offer_status == 'rejected':
                                print("✅ PASS: Offer rejected successfully")
                            else:
                                print(f"❌ FAIL: Expected offerStatus:rejected, got {offer_status}")
                        else:
                            print(f"❌ FAIL: Expected 200 with ok:true")
                    except Exception as e:
                        print(f"❌ FAIL: {e}")

                # Create a fourth offer for counter test
                print("\n[Setup] Creating fourth offer for counter test...")
                try:
                    cookies = {'tap_session': buyer_cookie}
                    r = requests.post(f"{BASE_URL}/conversations/{convo_id}/messages", 
                                    json={"type": "offer", "price": 4500}, cookies=cookies)
                    offer4_id = r.json().get('message', {}).get('id')
                    print(f"✅ Fourth offer created: {offer4_id}")
                except Exception as e:
                    print(f"❌ Failed to create fourth offer: {e}")
                    offer4_id = None

                # Test 6d: Seller counters offer -> 200, new counter-offer message created
                if offer4_id:
                    print("\n[6d] Seller counters with €4700 -> expect 200 with counter-offer message")
                    try:
                        cookies = {'tap_session': seller_cookie}
                        r = requests.post(f"{BASE_URL}/messages/{offer4_id}/offer-action", 
                                        json={"action": "counter", "price": 4700}, cookies=cookies)
                        print(f"Status: {r.status_code}")
                        resp = r.json()
                        print(f"Response: {json.dumps(resp, indent=2)}")
                        if r.status_code == 200 and resp.get('ok'):
                            counter = resp.get('counter')
                            if counter and counter.get('type') == 'offer' and counter.get('price') == 4700:
                                print(f"✅ PASS: Counter-offer created with price €4700")
                                
                                # Verify counter-offer appears in conversation
                                r2 = requests.get(f"{BASE_URL}/conversations/{convo_id}", cookies=cookies)
                                messages = r2.json().get('messages', [])
                                counter_msgs = [m for m in messages if m.get('id') == counter.get('id')]
                                if counter_msgs and counter_msgs[0].get('offerStatus') == 'pending':
                                    print(f"✅ Counter-offer in conversation with status:pending")
                                else:
                                    print("⚠️ Counter-offer not found in conversation or wrong status")
                            else:
                                print(f"❌ FAIL: Counter-offer not created correctly")
                        else:
                            print(f"❌ FAIL: Expected 200 with ok:true")
                    except Exception as e:
                        print(f"❌ FAIL: {e}")

                # Test 6e: Invalid action -> 400
                print("\n[6e] Invalid action 'unknown' -> expect 400")
                try:
                    cookies = {'tap_session': seller_cookie}
                    r = requests.post(f"{BASE_URL}/messages/{offer_msg_id}/offer-action", 
                                    json={"action": "unknown"}, cookies=cookies)
                    print(f"Status: {r.status_code}")
                    print(f"Response: {r.json()}")
                    if r.status_code == 400:
                        print("✅ PASS: Invalid action rejected")
                    else:
                        print(f"❌ FAIL: Expected 400, got {r.status_code}")
                except Exception as e:
                    print(f"❌ FAIL: {e}")

# ============================================================================
# TEST 7: REGRESSION TESTS
# ============================================================================
print("\n" + "=" * 80)
print("TEST 7: REGRESSION TESTS (Quick checks)")
print("=" * 80)

# Test 7a: POST /api/waitlist still works
print("\n[7a] POST /api/waitlist -> expect 200")
try:
    test_email = f"regression_{int(time.time())}@tapisserie.test"
    r = requests.post(f"{BASE_URL}/waitlist", json={"email": test_email})
    print(f"Status: {r.status_code}")
    if r.status_code == 200 and r.json().get('ok'):
        print("✅ PASS: Waitlist endpoint still working")
    else:
        print(f"❌ FAIL: Waitlist endpoint broken")
except Exception as e:
    print(f"❌ FAIL: {e}")

# Test 7b: POST /api/auth/signup still works
print("\n[7b] POST /api/auth/signup -> expect 200")
try:
    test_user = {
        "email": f"regression_{int(time.time())}@tapisserie.test",
        "username": f"regression{int(time.time())}",
        "password": "testpass123"
    }
    r = requests.post(f"{BASE_URL}/auth/signup", json=test_user)
    print(f"Status: {r.status_code}")
    if r.status_code == 200 and r.json().get('ok'):
        regression_cookie = r.cookies.get('tap_session')
        print("✅ PASS: Signup endpoint still working")
    else:
        print(f"❌ FAIL: Signup endpoint broken")
        regression_cookie = None
except Exception as e:
    print(f"❌ FAIL: {e}")
    regression_cookie = None

# Test 7c: POST /api/auth/login still works
if regression_cookie:
    print("\n[7c] POST /api/auth/login -> expect 200")
    try:
        r = requests.post(f"{BASE_URL}/auth/login", json={
            "email": test_user['email'],
            "password": test_user['password']
        })
        print(f"Status: {r.status_code}")
        if r.status_code == 200 and r.json().get('ok'):
            print("✅ PASS: Login endpoint still working")
        else:
            print(f"❌ FAIL: Login endpoint broken")
    except Exception as e:
        print(f"❌ FAIL: {e}")

# Test 7d: GET /api/listings still works
print("\n[7d] GET /api/listings -> expect 200")
try:
    r = requests.get(f"{BASE_URL}/listings")
    print(f"Status: {r.status_code}")
    if r.status_code == 200 and r.json().get('ok'):
        print("✅ PASS: Listings endpoint still working")
    else:
        print(f"❌ FAIL: Listings endpoint broken")
except Exception as e:
    print(f"❌ FAIL: {e}")

# Test 7e: GET /api/me still works
if regression_cookie:
    print("\n[7e] GET /api/me -> expect 200")
    try:
        cookies = {'tap_session': regression_cookie}
        r = requests.get(f"{BASE_URL}/me", cookies=cookies)
        print(f"Status: {r.status_code}")
        if r.status_code == 200 and 'user' in r.json():
            print("✅ PASS: /me endpoint still working")
        else:
            print(f"❌ FAIL: /me endpoint broken")
    except Exception as e:
        print(f"❌ FAIL: {e}")

print("\n" + "=" * 80)
print("ALL TESTS COMPLETED")
print("=" * 80)
