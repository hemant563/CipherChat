import requests

BASE_URL = "http://localhost:5001"


def test_post_api_auth_login_user_login():
    url_register = f"{BASE_URL}/api/auth/register"
    url_login = f"{BASE_URL}/api/auth/login"

    # Sample valid user registration data
    registration_payload = {
        "mobileNumber": "9998887776",
        "username": "testuser_tc002",
        "password": "StrongP@ssw0rd!"
    }
    headers = {'Content-Type': 'application/json'}

    try:
        # Register the user first to ensure valid credentials for login
        reg_resp = requests.post(url_register, json=registration_payload, headers=headers, timeout=30)
        assert reg_resp.status_code == 201, f"User registration failed with status {reg_resp.status_code}: {reg_resp.text}"

        # Now attempt to login with the same credentials
        login_payload = {
            "username": registration_payload["username"],
            "password": registration_payload["password"]
        }
        login_resp = requests.post(url_login, json=login_payload, headers=headers, timeout=30)
        assert login_resp.status_code == 200, f"Login failed with status {login_resp.status_code}: {login_resp.text}"

        login_data = login_resp.json()
        # Assert the JWT token is present and is a non-empty string
        assert "token" in login_data, "JWT token not found in login response"
        assert isinstance(login_data["token"], str) and len(login_data["token"]) > 0, "Invalid JWT token received"
    finally:
        # Clean up: delete the user if API supports; if not, skip deletion
        # Assuming no delete endpoint is provided in PRD, so no deletion step.
        pass


test_post_api_auth_login_user_login()