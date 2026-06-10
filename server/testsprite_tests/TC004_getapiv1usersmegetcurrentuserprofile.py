import requests

BASE_URL = "http://localhost:5001"
REGISTER_ENDPOINT = "/api/v1/auth/register"
LOGIN_ENDPOINT = "/api/v1/auth/login"
USER_PROFILE_ENDPOINT = "/api/v1/users/me"
TIMEOUT = 30

def test_get_current_user_profile_with_valid_jwt():
    # Sample user registration data (fixed to match server validation)
    registration_payload = {
        "username": "testuser_tc004",
        "password": "SecurePass123!",
        "phone": "+1234567890",
        "otpToken": "123456"
    }
    
    # Register user
    try:
        register_resp = requests.post(
            BASE_URL + REGISTER_ENDPOINT,
            json=registration_payload,
            timeout=TIMEOUT
        )
        assert register_resp.status_code == 201, f"Registration failed: {register_resp.text}"
        registered_user = register_resp.json()
        # Assert registered user has at least username
        assert "username" in registered_user and registered_user["username"] == registration_payload["username"]
        
        # Login user with username and password
        login_payload = {
            "username": registration_payload["username"],
            "password": registration_payload["password"]
        }
        login_resp = requests.post(
            BASE_URL + LOGIN_ENDPOINT,
            json=login_payload,
            timeout=TIMEOUT
        )
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        login_data = login_resp.json()
        assert "token" in login_data and isinstance(login_data["token"], str) and login_data["token"]
        token = login_data["token"]
        
        # Get current user profile with valid JWT
        headers = {
            "Authorization": f"Bearer {token}"
        }
        profile_resp = requests.get(
            BASE_URL + USER_PROFILE_ENDPOINT,
            headers=headers,
            timeout=TIMEOUT
        )
        assert profile_resp.status_code == 200, f"Fetching profile failed: {profile_resp.text}"
        profile_data = profile_resp.json()
        
        # Validate profile data contains expected fields (at least username)
        assert "username" in profile_data and profile_data["username"] == registration_payload["username"]
        
    finally:
        # Cleanup: delete the created user if delete endpoint existed
        # Skipped as per PRD
        pass


test_get_current_user_profile_with_valid_jwt()
