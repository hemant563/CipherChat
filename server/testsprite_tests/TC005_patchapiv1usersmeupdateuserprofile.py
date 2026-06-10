import requests

BASE_URL = "http://localhost:5001"
TIMEOUT = 30

def test_patch_api_v1_users_me_update_user_profile():
    # First, register a new user to obtain credentials and auth token
    register_url = f"{BASE_URL}/api/v1/auth/register"
    login_url = f"{BASE_URL}/api/v1/auth/login"
    patch_profile_url = f"{BASE_URL}/api/v1/users/me"

    user_registration_data = {
        "email": "testuser_tc005@example.com",
        "password": "StrongPass!123",
        "role": "tenant"
    }

    # Updated profile data to patch
    updated_profile_data = {
        "name": "Test User Updated TC005",
        "phone": "+12345678901",
        "bio": "Updated bio for testing patch endpoint"
    }

    headers = {
        "Content-Type": "application/json"
    }

    registered_user = None
    auth_headers = {}

    try:
        # Register user
        register_resp = requests.post(register_url, json=user_registration_data, headers=headers, timeout=TIMEOUT)
        assert register_resp.status_code == 201, f"User registration failed with status {register_resp.status_code}"
        registered_user = register_resp.json()
        assert "email" in registered_user and registered_user["email"] == user_registration_data["email"]

        # Login user to get auth token
        login_data = {
            "email": user_registration_data["email"],
            "password": user_registration_data["password"]
        }
        login_resp = requests.post(login_url, json=login_data, headers=headers, timeout=TIMEOUT)
        assert login_resp.status_code == 200, f"User login failed with status {login_resp.status_code}"
        login_resp_json = login_resp.json()
        assert "token" in login_resp_json and isinstance(login_resp_json["token"], str)
        token = login_resp_json["token"]

        auth_headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }

        # Patch user profile with updated data
        patch_resp = requests.patch(patch_profile_url, json=updated_profile_data, headers=auth_headers, timeout=TIMEOUT)
        assert patch_resp.status_code == 200, f"Patch user profile failed with status {patch_resp.status_code}"

        patch_resp_json = patch_resp.json()
        # Validate that returned profile contains updated fields with correct values
        for key, value in updated_profile_data.items():
            assert key in patch_resp_json, f"Response missing field '{key}'"
            assert patch_resp_json[key] == value, f"Field '{key}' value mismatch: expected '{value}', got '{patch_resp_json[key]}'"

    finally:
        # Cleanup: Delete the registered user to avoid polluting test data
        # Need to fetch user id from registered user info or profile call
        # Assuming registered_user has an 'id' or '_id' field, otherwise try patch_resp json or get profile
        user_id = None
        if registered_user:
            if "id" in registered_user:
                user_id = registered_user["id"]
            elif "_id" in registered_user:
                user_id = registered_user["_id"]
        if not user_id and auth_headers:
            try:
                profile_resp = requests.get(patch_profile_url, headers=auth_headers, timeout=TIMEOUT)
                if profile_resp.status_code == 200:
                    profile_json = profile_resp.json()
                    if "id" in profile_json:
                        user_id = profile_json["id"]
                    elif "_id" in profile_json:
                        user_id = profile_json["_id"]
            except Exception:
                pass

        if user_id and auth_headers:
            delete_url = f"{BASE_URL}/api/v1/users/{user_id}"
            try:
                requests.delete(delete_url, headers=auth_headers, timeout=TIMEOUT)
            except Exception:
                pass


test_patch_api_v1_users_me_update_user_profile()
