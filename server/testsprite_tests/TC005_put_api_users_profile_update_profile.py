import requests

BASE_URL = "http://localhost:5001"
TIMEOUT = 30

def test_put_api_users_profile_update_profile():
    register_url = f"{BASE_URL}/api/auth/register"
    login_url = f"{BASE_URL}/api/auth/login"
    profile_url = f"{BASE_URL}/api/users/profile"

    user_data = {
        "mobile": "+12345678901",
        "username": "testuser_updateprofile",
        "password": "TestPass123!"
    }
    updated_profile_data = {
        "displayName": "Updated Test User",
        "bio": "This is an updated bio for testing.",
        "avatarUrl": "https://res.cloudinary.com/demo/image/upload/sample.jpg"
    }

    jwt_token = None

    try:
        # Register new user
        reg_resp = requests.post(register_url, json=user_data, timeout=TIMEOUT)
        assert reg_resp.status_code == 201, f"Registration failed with status {reg_resp.status_code}: {reg_resp.text}"

        # Login to get JWT token
        login_payload = {
            "username": user_data["username"],
            "password": user_data["password"]
        }
        login_resp = requests.post(login_url, json=login_payload, timeout=TIMEOUT)
        assert login_resp.status_code == 200, f"Login failed with status {login_resp.status_code}: {login_resp.text}"
        login_resp_json = login_resp.json()
        assert "token" in login_resp_json, "JWT token missing in login response"
        jwt_token = login_resp_json["token"]

        headers = {
            "Authorization": f"Bearer {jwt_token}",
            "Content-Type": "application/json"
        }

        # Update user profile (PUT)
        put_resp = requests.put(profile_url, json=updated_profile_data, headers=headers, timeout=TIMEOUT)
        assert put_resp.status_code == 200, f"Profile update failed with status {put_resp.status_code}: {put_resp.text}"

        # Verify updated profile via GET
        get_resp = requests.get(profile_url, headers=headers, timeout=TIMEOUT)
        assert get_resp.status_code == 200, f"Get profile failed with status {get_resp.status_code}: {get_resp.text}"
        profile = get_resp.json()
        for key, value in updated_profile_data.items():
            assert profile.get(key) == value, f"Expected {key} to be {value}, got {profile.get(key)}"

    finally:
        # Cleanup: delete the test user if API supported it (not specified in PRD)
        # Since no delete user endpoint provided, skipping actual delete cleanup.
        pass

test_put_api_users_profile_update_profile()