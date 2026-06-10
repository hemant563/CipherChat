import requests

BASE_URL = "http://localhost:5001"
LOGIN_ENDPOINT = "/api/v1/auth/login"
REGISTER_ENDPOINT = "/api/v1/auth/register"
TIMEOUT = 30

def test_postapiv1authloginuserlogin():
    # Prepare valid user registration data to ensure a known user exists
    user_data = {
        "email": "testuser_login@example.com",
        "password": "TestPass123!",
        "role": "tenant",  # required field
        "name": "Test User"  # added required field
    }

    try:
        # Register user first to ensure valid credentials
        reg_response = requests.post(
            BASE_URL + REGISTER_ENDPOINT,
            json=user_data,
            timeout=TIMEOUT
        )
        # Must be 201 Created or fail test if 400 validation error
        assert reg_response.status_code == 201, f"User registration failed with status: {reg_response.status_code}"

        # Attempt login with valid credentials
        login_payload = {
            "email": user_data["email"],
            "password": user_data["password"]
        }
        login_response = requests.post(
            BASE_URL + LOGIN_ENDPOINT,
            json=login_payload,
            timeout=TIMEOUT
        )
        assert login_response.status_code == 200, f"Expected 200 OK, got {login_response.status_code}"

        login_json = login_response.json()
        # Validate presence of authentication token
        assert "token" in login_json, "Authentication token not found in response"
        token = login_json.get("token")
        assert isinstance(token, str) and len(token) > 0, "Invalid authentication token"

    except requests.RequestException as e:
        assert False, f"HTTP request failed: {e}"


test_postapiv1authloginuserlogin()
