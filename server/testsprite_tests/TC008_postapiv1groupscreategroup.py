import requests

BASE_URL = "http://localhost:5001"
TIMEOUT = 30

def get_auth_token():
    # Register a new user
    register_url = f"{BASE_URL}/api/v1/auth/register"
    user_payload = {
        "email": "testuser_group_create@example.com",
        "password": "TestPassword123!",
        "role": "tenant",
        "name": "Test User Group Create"
    }
    register_resp = requests.post(register_url, json=user_payload, timeout=TIMEOUT)
    assert register_resp.status_code == 201, f"User registration failed: {register_resp.text}"

    # Login with the new user to get JWT token
    login_url = f"{BASE_URL}/api/v1/auth/login"
    login_payload = {
        "email": user_payload["email"],
        "password": user_payload["password"]
    }
    login_resp = requests.post(login_url, json=login_payload, timeout=TIMEOUT)
    assert login_resp.status_code == 200, f"User login failed: {login_resp.text}"
    login_data = login_resp.json()
    token = login_data.get("token") or login_data.get("accessToken") or login_data.get("jwt")
    assert token, "Authentication token not found in login response"
    return token

def test_postapiv1groupscreategroup():
    token = get_auth_token()
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    create_group_url = f"{BASE_URL}/api/v1/groups"
    group_payload = {
        "name": "Test Group for TC008",
        "description": "This is a test group created during automated testing.",
        "visibility": "public"
    }
    created_group_id = None
    try:
        resp = requests.post(create_group_url, json=group_payload, headers=headers, timeout=TIMEOUT)
        assert resp.status_code == 201, f"Expected 201 status, got {resp.status_code}: {resp.text}"
        group_data = resp.json()
        assert isinstance(group_data, dict), "Response is not a JSON object"
        assert group_data.get("name") == group_payload["name"], "Group name mismatch"
        assert group_data.get("description") == group_payload["description"], "Group description mismatch"
        assert group_data.get("visibility") == group_payload["visibility"], "Group visibility mismatch"
        created_group_id = group_data.get("id") or group_data.get("_id")
        assert created_group_id, "Created group ID not found in response"
    finally:
        # Clean up: delete the created group if possible
        if created_group_id:
            delete_url = f"{BASE_URL}/api/v1/groups/{created_group_id}"
            try:
                del_resp = requests.delete(delete_url, headers=headers, timeout=TIMEOUT)
                # Accept 200 or 204 as successful deletion
                assert del_resp.status_code in (200, 204), f"Group deletion failed with status {del_resp.status_code}"
            except Exception:
                pass

test_postapiv1groupscreategroup()