import requests

BASE_URL = "http://localhost:5001"
TIMEOUT = 30

def test_post_api_v1_auth_send_otp_send_otp_verification():
    url = f"{BASE_URL}/api/v1/auth/send-otp"
    headers = {
        "Content-Type": "application/json"
    }
    # Use a valid email format for testing
    payload = {
        "email": "testuser@example.com"
    }

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=TIMEOUT)
    except requests.RequestException as e:
        assert False, f"Request to send OTP failed with exception: {e}"

    assert response.status_code == 200, f"Expected status code 200, got {response.status_code}"

    # Validate response content to confirm OTP delivery confirmation
    try:
        resp_json = response.json()
    except ValueError:
        assert False, "Response is not in JSON format"

    # Expected confirmation keys could be message or success flag
    # Since schema is not specified for response, check common fields
    assert ("message" in resp_json and "otp" in resp_json["message"].lower()) or \
           ("success" in resp_json and resp_json["success"] is True), \
           "Response JSON does not confirm OTP delivery"

test_post_api_v1_auth_send_otp_send_otp_verification()