import requests
import uuid

BASE_URL = "http://localhost:5001"
TIMEOUT = 30

def test_get_api_users_profile_retrieve_profile():
    # Step 1: Register a new user (to get a valid JWT token)
    registration_payload = {
        "mobile": f"+100000000{str(uuid.uuid4().int)[:4]}",
        "username": f"user_{uuid.uuid4().hex[:8]}",
        "password": "TestPassword123!"
    }
    try:
        reg_response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json=registration_payload,
            timeout=TIMEOUT
        )
        assert reg_response.status_code == 201, f"Registration failed: {reg_response.text}"
    except requests.RequestException as e:
        assert False, f"Exception during registration: {e}"

    # Step 2: Login with the same user to get JWT token
    login_payload = {
        "username": registration_payload["username"],
        "password": registration_payload["password"]
    }
    try:
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=login_payload,
            timeout=TIMEOUT
        )
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        token = login_response.json().get("token")
        assert token, "JWT token not found in login response"
    except requests.RequestException as e:
        assert False, f"Exception during login: {e}"

    headers = {
        "Authorization": f"Bearer {token}"
    }

    # Step 3: Retrieve authenticated user's profile
    try:
        profile_response = requests.get(
            f"{BASE_URL}/api/users/profile",
            headers=headers,
            timeout=TIMEOUT
        )
        assert profile_response.status_code == 200, f"Profile retrieval failed: {profile_response.text}"
        profile_data = profile_response.json()
        # Basic checks on profile response structure
        assert isinstance(profile_data, dict), "Profile response is not a JSON object"
        # Assuming profile has username and mobile masked or absent
        assert "username" in profile_data, "Profile missing 'username'"
        # Phone number should be hidden, so check it is absent or masked
        phone_present = "mobile" in profile_data and profile_data.get("mobile")
        assert not phone_present or profile_data.get("mobile").startswith("****"), \
            "Phone number not hidden in profile"
    except requests.RequestException as e:
        assert False, f"Exception during profile retrieval: {e}"

    # Cleanup: delete user if API provided (not specified in PRD, so omitted)

test_get_api_users_profile_retrieve_profile()