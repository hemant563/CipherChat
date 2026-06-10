import requests
import uuid

BASE_URL = "http://localhost:5001"
REGISTER_ENDPOINT = "/api/auth/register"
TIMEOUT = 30

def test_post_api_auth_register_user_registration():
    url = BASE_URL + REGISTER_ENDPOINT
    unique_suffix = str(uuid.uuid4())[:8]
    payload = {
        "mobile_number": f"1234567{unique_suffix}",
        "username": f"user_{unique_suffix}",
        "password": "StrongPass!23"
    }

    headers = {
        "Content-Type": "application/json"
    }

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=TIMEOUT)
        assert response.status_code == 201, f"Expected 201 but got {response.status_code}, response: {response.text}"
    except requests.RequestException as e:
        assert False, f"Request failed: {str(e)}"

test_post_api_auth_register_user_registration()