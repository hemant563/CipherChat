import requests

BASE_URL = "http://localhost:5001"
TIMEOUT = 30

def test_patch_api_v1_users_me_settings_update_user_settings():
    # Register a new user with required fields only
    register_payload = {
        "username": "testuser_tc006",
        "password": "TestPassword123!"
    }
    register_resp = requests.post(f"{BASE_URL}/api/v1/auth/register", json=register_payload, timeout=TIMEOUT)
    assert register_resp.status_code == 201, f"Registration failed: {register_resp.text}"
    user_data = register_resp.json()
    
    try:
        # Login to get auth token
        login_payload = {
            "username": register_payload["username"],
            "password": register_payload["password"]
        }
        login_resp = requests.post(f"{BASE_URL}/api/v1/auth/login", json=login_payload, timeout=TIMEOUT)
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        token = login_resp.json().get("token")
        assert token, "Auth token not found in login response"
        headers = {"Authorization": f"Bearer {token}"}
        
        # Prepare valid preference changes payload for PATCH /api/v1/users/me/settings
        settings_payload = {
            "preferences": {
                "notifications": {
                    "email": True,
                    "sms": False,
                    "push": True
                },
                "theme": "dark",
                "language": "en-US"
            }
        }
        
        patch_resp = requests.patch(f"{BASE_URL}/api/v1/users/me/settings", json=settings_payload, headers=headers, timeout=TIMEOUT)
        assert patch_resp.status_code == 200, f"Update settings failed: {patch_resp.text}"
        updated_settings = patch_resp.json()
        
        # Assert updated settings reflect the changes
        assert updated_settings.get("preferences") == settings_payload["preferences"], "Updated settings do not match the changes sent"
        
    finally:
        # Cleanup: delete the created user
        # Assuming DELETE /api/v1/users/me is available to delete own account, else skip cleanup
        if 'token' in locals():
            requests.delete(f"{BASE_URL}/api/v1/users/me", headers={"Authorization": f"Bearer {token}"}, timeout=TIMEOUT)

test_patch_api_v1_users_me_settings_update_user_settings()
