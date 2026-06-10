import requests
import uuid

def test_post_api_v1_auth_register_user_registration():
    base_url = "http://localhost:5001"
    url = f"{base_url}/api/v1/auth/register"
    headers = {
        "Content-Type": "application/json"
    }

    # Sample valid tenant user registration payload
    payload = {
        "email": f"tenant_{uuid.uuid4().hex[:8]}@example.com",
        "username": f"tenantuser_{uuid.uuid4().hex[:8]}",
        "password": "StrongPass!23",
        "passwordConfirm": "StrongPass!23",
        "role": "tenant",
        "firstName": "Test",
        "lastName": "Tenant",
        "phone": "+1234567890"
    }

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=30)
        assert response.status_code == 201, f"Expected 201, got {response.status_code}"
        response_json = response.json()
        # Validate registered user data presence
        assert "id" in response_json, "Response missing 'id'"
        assert response_json.get("email") == payload["email"], "Email mismatch in response"
        assert response_json.get("role") == payload["role"], "Role mismatch in response"
        assert response_json.get("firstName") == payload["firstName"], "First name mismatch in response"
        assert response_json.get("lastName") == payload["lastName"], "Last name mismatch in response"
    except requests.RequestException as e:
        assert False, f"HTTP request failed: {e}"

test_post_api_v1_auth_register_user_registration()
