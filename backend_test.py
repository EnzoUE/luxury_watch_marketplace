#!/usr/bin/env python3
"""
Backend API tests for TAPISSERIE Phase 1
Tests all backend endpoints in /app/app/api/[[...path]]/route.js
"""

import requests
import json
import sys
from datetime import datetime

# Configuration
BASE_URL = "https://chronoluxe-trade.preview.emergentagent.com/api"
ADMIN_PASSWORD = "swatch2026"

# Test results tracking
test_results = {
    "passed": 0,
    "failed": 0,
    "errors": []
}

def log_test(test_name, passed, details=""):
    """Log test result"""
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"\n{status}: {test_name}")
    if details:
        print(f"  Details: {details}")
    
    if passed:
        test_results["passed"] += 1
    else:
        test_results["failed"] += 1
        test_results["errors"].append(f"{test_name}: {details}")

def test_health_endpoint():
    """Test GET /api/health"""
    print("\n" + "="*80)
    print("TEST: Health Endpoint")
    print("="*80)
    
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=10)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get("ok") == True:
                log_test("GET /api/health returns 200 with ok:true", True)
                return True
            else:
                log_test("GET /api/health returns 200 with ok:true", False, f"ok field is {data.get('ok')}")
                return False
        else:
            log_test("GET /api/health returns 200", False, f"Got status {response.status_code}")
            return False
    except Exception as e:
        log_test("GET /api/health", False, f"Exception: {str(e)}")
        return False

def test_waitlist_valid_email():
    """Test POST /api/waitlist with valid email"""
    print("\n" + "="*80)
    print("TEST: Waitlist - Valid Email")
    print("="*80)
    
    try:
        email = f"test+phase1+{datetime.now().timestamp()}@tapisserie.dev"
        payload = {"email": email, "referrer": "test"}
        
        response = requests.post(
            f"{BASE_URL}/waitlist",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        print(f"Email: {email}")
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            required_fields = ["ok", "duplicate", "position", "message"]
            missing_fields = [f for f in required_fields if f not in data]
            
            if missing_fields:
                log_test("POST /api/waitlist valid email - response structure", False, 
                        f"Missing fields: {missing_fields}")
                return False
            
            if data.get("ok") == True and data.get("duplicate") == False and isinstance(data.get("position"), int):
                log_test("POST /api/waitlist with valid email", True, 
                        f"Position: {data.get('position')}")
                return email  # Return email for duplicate test
            else:
                log_test("POST /api/waitlist with valid email", False, 
                        f"Unexpected response values: {data}")
                return False
        else:
            log_test("POST /api/waitlist with valid email", False, 
                    f"Expected 200, got {response.status_code}")
            return False
    except Exception as e:
        log_test("POST /api/waitlist with valid email", False, f"Exception: {str(e)}")
        return False

def test_waitlist_duplicate_email(email):
    """Test POST /api/waitlist with duplicate email"""
    print("\n" + "="*80)
    print("TEST: Waitlist - Duplicate Email")
    print("="*80)
    
    try:
        payload = {"email": email}
        
        response = requests.post(
            f"{BASE_URL}/waitlist",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        print(f"Email: {email}")
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get("ok") == True and data.get("duplicate") == True:
                log_test("POST /api/waitlist with duplicate email", True)
                return True
            else:
                log_test("POST /api/waitlist with duplicate email", False, 
                        f"Expected duplicate:true, got {data}")
                return False
        else:
            log_test("POST /api/waitlist with duplicate email", False, 
                    f"Expected 200, got {response.status_code}")
            return False
    except Exception as e:
        log_test("POST /api/waitlist with duplicate email", False, f"Exception: {str(e)}")
        return False

def test_waitlist_email_normalization():
    """Test email normalization (whitespace + case)"""
    print("\n" + "="*80)
    print("TEST: Waitlist - Email Normalization")
    print("="*80)
    
    try:
        # First, submit with whitespace and uppercase
        timestamp = datetime.now().timestamp()
        email_unnormalized = f"  Test+Normalize+{timestamp}@BAR.com "
        email_normalized = f"test+normalize+{timestamp}@bar.com"
        
        payload1 = {"email": email_unnormalized}
        response1 = requests.post(
            f"{BASE_URL}/waitlist",
            json=payload1,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        print(f"First submission: '{email_unnormalized}'")
        print(f"Status Code: {response1.status_code}")
        print(f"Response: {response1.text}")
        
        if response1.status_code != 200:
            log_test("Email normalization - first submission", False, 
                    f"Expected 200, got {response1.status_code}")
            return False
        
        data1 = response1.json()
        if data1.get("duplicate") == True:
            log_test("Email normalization - first submission", False, 
                    "First submission marked as duplicate")
            return False
        
        # Now submit the normalized version - should be duplicate
        payload2 = {"email": email_normalized}
        response2 = requests.post(
            f"{BASE_URL}/waitlist",
            json=payload2,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        print(f"\nSecond submission: '{email_normalized}'")
        print(f"Status Code: {response2.status_code}")
        print(f"Response: {response2.text}")
        
        if response2.status_code == 200:
            data2 = response2.json()
            if data2.get("ok") == True and data2.get("duplicate") == True:
                log_test("Email normalization (whitespace + case)", True)
                return True
            else:
                log_test("Email normalization (whitespace + case)", False, 
                        f"Expected duplicate:true, got {data2}")
                return False
        else:
            log_test("Email normalization (whitespace + case)", False, 
                    f"Expected 200, got {response2.status_code}")
            return False
    except Exception as e:
        log_test("Email normalization", False, f"Exception: {str(e)}")
        return False

def test_waitlist_invalid_email():
    """Test POST /api/waitlist with invalid email"""
    print("\n" + "="*80)
    print("TEST: Waitlist - Invalid Email")
    print("="*80)
    
    try:
        payload = {"email": "not-an-email"}
        
        response = requests.post(
            f"{BASE_URL}/waitlist",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        print(f"Email: not-an-email")
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 400:
            data = response.json()
            if "error" in data:
                log_test("POST /api/waitlist with invalid email returns 400", True)
                return True
            else:
                log_test("POST /api/waitlist with invalid email", False, 
                        "400 status but no error field in response")
                return False
        else:
            log_test("POST /api/waitlist with invalid email", False, 
                    f"Expected 400, got {response.status_code}")
            return False
    except Exception as e:
        log_test("POST /api/waitlist with invalid email", False, f"Exception: {str(e)}")
        return False

def test_waitlist_missing_email():
    """Test POST /api/waitlist with missing email"""
    print("\n" + "="*80)
    print("TEST: Waitlist - Missing Email")
    print("="*80)
    
    try:
        payload = {}
        
        response = requests.post(
            f"{BASE_URL}/waitlist",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        print(f"Payload: {payload}")
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 400:
            data = response.json()
            if "error" in data:
                log_test("POST /api/waitlist with missing email returns 400", True)
                return True
            else:
                log_test("POST /api/waitlist with missing email", False, 
                        "400 status but no error field in response")
                return False
        else:
            log_test("POST /api/waitlist with missing email", False, 
                    f"Expected 400, got {response.status_code}")
            return False
    except Exception as e:
        log_test("POST /api/waitlist with missing email", False, f"Exception: {str(e)}")
        return False

def test_waitlist_stats():
    """Test GET /api/waitlist/stats"""
    print("\n" + "="*80)
    print("TEST: Waitlist Stats")
    print("="*80)
    
    try:
        response = requests.get(f"{BASE_URL}/waitlist/stats", timeout=10)
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get("ok") == True and "count" in data and isinstance(data["count"], int):
                log_test("GET /api/waitlist/stats", True, f"Count: {data['count']}")
                return True
            else:
                log_test("GET /api/waitlist/stats", False, 
                        f"Missing or invalid fields: {data}")
                return False
        else:
            log_test("GET /api/waitlist/stats", False, 
                    f"Expected 200, got {response.status_code}")
            return False
    except Exception as e:
        log_test("GET /api/waitlist/stats", False, f"Exception: {str(e)}")
        return False

def test_admin_auth_valid():
    """Test POST /api/admin/auth with valid password"""
    print("\n" + "="*80)
    print("TEST: Admin Auth - Valid Password")
    print("="*80)
    
    try:
        payload = {"password": ADMIN_PASSWORD}
        
        response = requests.post(
            f"{BASE_URL}/admin/auth",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        print(f"Password: {ADMIN_PASSWORD}")
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get("ok") == True:
                log_test("POST /api/admin/auth with valid password", True)
                return True
            else:
                log_test("POST /api/admin/auth with valid password", False, 
                        f"ok field is {data.get('ok')}")
                return False
        else:
            log_test("POST /api/admin/auth with valid password", False, 
                    f"Expected 200, got {response.status_code}")
            return False
    except Exception as e:
        log_test("POST /api/admin/auth with valid password", False, f"Exception: {str(e)}")
        return False

def test_admin_auth_invalid():
    """Test POST /api/admin/auth with invalid password"""
    print("\n" + "="*80)
    print("TEST: Admin Auth - Invalid Password")
    print("="*80)
    
    try:
        payload = {"password": "wrong"}
        
        response = requests.post(
            f"{BASE_URL}/admin/auth",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        print(f"Password: wrong")
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 401:
            data = response.json()
            if data.get("ok") == False:
                log_test("POST /api/admin/auth with invalid password returns 401", True)
                return True
            else:
                log_test("POST /api/admin/auth with invalid password", False, 
                        f"ok field should be false, got {data.get('ok')}")
                return False
        else:
            log_test("POST /api/admin/auth with invalid password", False, 
                    f"Expected 401, got {response.status_code}")
            return False
    except Exception as e:
        log_test("POST /api/admin/auth with invalid password", False, f"Exception: {str(e)}")
        return False

def test_admin_waitlist_no_auth():
    """Test GET /api/admin/waitlist without authentication"""
    print("\n" + "="*80)
    print("TEST: Admin Waitlist - No Auth")
    print("="*80)
    
    try:
        response = requests.get(f"{BASE_URL}/admin/waitlist", timeout=10)
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 401:
            log_test("GET /api/admin/waitlist without auth returns 401", True)
            return True
        else:
            log_test("GET /api/admin/waitlist without auth", False, 
                    f"Expected 401, got {response.status_code}")
            return False
    except Exception as e:
        log_test("GET /api/admin/waitlist without auth", False, f"Exception: {str(e)}")
        return False

def test_admin_waitlist_with_auth():
    """Test GET /api/admin/waitlist with authentication"""
    print("\n" + "="*80)
    print("TEST: Admin Waitlist - With Auth")
    print("="*80)
    
    try:
        headers = {"x-admin-password": ADMIN_PASSWORD}
        
        response = requests.get(
            f"{BASE_URL}/admin/waitlist",
            headers=headers,
            timeout=10
        )
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text[:500]}...")  # Truncate long response
        
        if response.status_code == 200:
            data = response.json()
            
            # Check required fields
            if not (data.get("ok") == True and "count" in data and "items" in data):
                log_test("GET /api/admin/waitlist with auth - response structure", False, 
                        f"Missing required fields: {data.keys()}")
                return False
            
            # Check items structure
            items = data.get("items", [])
            if len(items) > 0:
                first_item = items[0]
                print(f"\nFirst item fields: {first_item.keys()}")
                
                # Verify _id is NOT present
                if "_id" in first_item:
                    log_test("GET /api/admin/waitlist - items exclude _id", False, 
                            "_id field found in items")
                    return False
                
                # Verify expected fields are present
                expected_fields = ["id", "email", "createdAt"]
                missing = [f for f in expected_fields if f not in first_item]
                if missing:
                    log_test("GET /api/admin/waitlist - items structure", False, 
                            f"Missing fields: {missing}")
                    return False
                
                # Check sorting (createdAt descending)
                if len(items) > 1:
                    first_date = items[0].get("createdAt")
                    second_date = items[1].get("createdAt")
                    if first_date < second_date:
                        log_test("GET /api/admin/waitlist - sorting", False, 
                                "Items not sorted by createdAt descending")
                        return False
            
            log_test("GET /api/admin/waitlist with auth", True, 
                    f"Count: {data['count']}, Items: {len(items)}")
            return True
        else:
            log_test("GET /api/admin/waitlist with auth", False, 
                    f"Expected 200, got {response.status_code}")
            return False
    except Exception as e:
        log_test("GET /api/admin/waitlist with auth", False, f"Exception: {str(e)}")
        return False

def test_admin_export_no_auth():
    """Test GET /api/admin/waitlist/export without password"""
    print("\n" + "="*80)
    print("TEST: Admin Export - No Auth")
    print("="*80)
    
    try:
        response = requests.get(f"{BASE_URL}/admin/waitlist/export", timeout=10)
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text[:200]}...")
        
        if response.status_code == 401:
            log_test("GET /api/admin/waitlist/export without password returns 401", True)
            return True
        else:
            log_test("GET /api/admin/waitlist/export without password", False, 
                    f"Expected 401, got {response.status_code}")
            return False
    except Exception as e:
        log_test("GET /api/admin/waitlist/export without password", False, f"Exception: {str(e)}")
        return False

def test_admin_export_with_auth():
    """Test GET /api/admin/waitlist/export with password"""
    print("\n" + "="*80)
    print("TEST: Admin Export - With Auth")
    print("="*80)
    
    try:
        response = requests.get(
            f"{BASE_URL}/admin/waitlist/export?password={ADMIN_PASSWORD}",
            timeout=10
        )
        
        print(f"Status Code: {response.status_code}")
        print(f"Content-Type: {response.headers.get('Content-Type')}")
        print(f"Response (first 300 chars): {response.text[:300]}...")
        
        if response.status_code == 200:
            content_type = response.headers.get("Content-Type", "")
            
            # Check Content-Type
            if not content_type.startswith("text/csv"):
                log_test("GET /api/admin/waitlist/export - Content-Type", False, 
                        f"Expected text/csv, got {content_type}")
                return False
            
            # Check CSV content
            csv_content = response.text
            lines = csv_content.strip().split('\n')
            
            if len(lines) < 1:
                log_test("GET /api/admin/waitlist/export - CSV content", False, 
                        "CSV is empty")
                return False
            
            # Check header row
            header = lines[0].lower()
            if "email" not in header or "createdat" not in header or "referrer" not in header:
                log_test("GET /api/admin/waitlist/export - CSV header", False, 
                        f"Missing required columns in header: {lines[0]}")
                return False
            
            log_test("GET /api/admin/waitlist/export with password", True, 
                    f"CSV rows: {len(lines)}")
            return True
        else:
            log_test("GET /api/admin/waitlist/export with password", False, 
                    f"Expected 200, got {response.status_code}")
            return False
    except Exception as e:
        log_test("GET /api/admin/waitlist/export with password", False, f"Exception: {str(e)}")
        return False

def main():
    """Run all backend tests"""
    print("\n" + "="*80)
    print("TAPISSERIE PHASE 1 - BACKEND API TESTS")
    print("="*80)
    print(f"Base URL: {BASE_URL}")
    print(f"Admin Password: {ADMIN_PASSWORD}")
    print(f"Test Time: {datetime.now().isoformat()}")
    
    # Test in priority order as specified in review_request
    
    # 1. Health endpoint (quick check)
    test_health_endpoint()
    
    # 2. Waitlist endpoints (high priority)
    valid_email = test_waitlist_valid_email()
    if valid_email:
        test_waitlist_duplicate_email(valid_email)
    
    test_waitlist_email_normalization()
    test_waitlist_invalid_email()
    test_waitlist_missing_email()
    test_waitlist_stats()
    
    # 3. Admin auth (high priority)
    test_admin_auth_valid()
    test_admin_auth_invalid()
    
    # 4. Admin waitlist listing (high priority)
    test_admin_waitlist_no_auth()
    test_admin_waitlist_with_auth()
    
    # 5. Admin export (high priority)
    test_admin_export_no_auth()
    test_admin_export_with_auth()
    
    # Print summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    print(f"✅ Passed: {test_results['passed']}")
    print(f"❌ Failed: {test_results['failed']}")
    print(f"Total: {test_results['passed'] + test_results['failed']}")
    
    if test_results['failed'] > 0:
        print("\n" + "="*80)
        print("FAILED TESTS:")
        print("="*80)
        for error in test_results['errors']:
            print(f"  • {error}")
    
    # Exit with appropriate code
    sys.exit(0 if test_results['failed'] == 0 else 1)

if __name__ == "__main__":
    main()
