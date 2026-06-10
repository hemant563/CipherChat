import requests

BASE_URL = "http://localhost:5001"
REGISTER_URL = f"{BASE_URL}/api/v1/auth/register"
LOGIN_URL = f"{BASE_URL}/api/v1/auth/login"
SEND_OTP_URL = f"{BASE_URL}/api/v1/auth/send-otp"
GROUPS_EXPLORE_URL = f"{BASE_URL}/api/v1/groups/explore"

timeout = 30

def test_get_public_groups_with_valid_jwt():
    # Send OTP to email
    email = "testuser_tc007@example.com"
    send_otp_payload = {"email": email}
    try:
        otp_resp = requests.post(SEND_OTP_URL, json=send_otp_payload, timeout=timeout)
        assert otp_resp.status_code == 200, f"Send OTP failed: {otp_resp.text}"

        otp_token = otp_resp.json().get("otpToken")
        assert otp_token, "OTP token not found in send OTP response"

        # Register a new user with email and otpToken
        register_payload = {
            "username": "testuser_tc007",
            "email": email,
            "password": "TestPass123!",
            "otpToken": otp_token
        }

        reg_resp = requests.post(REGISTER_URL, json=register_payload, timeout=timeout)
        assert reg_resp.status_code == 201, f"User registration failed: {reg_resp.text}"

        # Login with the registered user using email and password
        login_payload = {
            "email": email,
            "password": register_payload["password"]
        }
        login_resp = requests.post(LOGIN_URL, json=login_payload, timeout=timeout)
        assert login_resp.status_code == 200, f"User login failed: {login_resp.text}"
        token = login_resp.json().get("token")
        assert token, "JWT token not found in login response"

        headers = {"Authorization": f"Bearer {token}"}
        # Explore public groups
        explore_resp = requests.get(GROUPS_EXPLORE_URL, headers=headers, timeout=timeout)
        assert explore_resp.status_code == 200, f"Explore groups failed: {explore_resp.text}"
        data = explore_resp.json()
        assert isinstance(data, list), "Expected list of public groups"
    finally:
        # Cleanup: Delete the user if possible, otherwise ignore
        # No delete user endpoint provided in PRD, so we skip this.
        pass


test_get_public_groups_with_valid_jwt()