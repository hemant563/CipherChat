import requests

BASE_URL = "http://localhost:5001"
TIMEOUT = 30

def test_post_api_auth_send_otp_delivery():
    url = f"{BASE_URL}/api/auth/send-otp"
    payload = {
        "mobile": "+15555550123"
    }
    headers = {
        "Content-Type": "application/json"
    }

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=TIMEOUT)
        assert response.status_code == 200, f"Expected status code 200, got {response.status_code}"
        json_response = response.json()
        # Assuming a confirmation field or message exists to confirm OTP delivery
        assert "message" in json_response or "status" in json_response, "Response missing confirmation message or status"

    except requests.RequestException as e:
        assert False, f"HTTP request failed: {e}"

test_post_api_auth_send_otp_delivery()