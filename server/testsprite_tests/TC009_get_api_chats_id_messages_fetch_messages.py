import requests
import uuid

BASE_URL = "http://localhost:5001"
TIMEOUT = 30

def test_get_api_chats_id_messages_fetch_messages():
    # Register a new user
    register_url = f"{BASE_URL}/api/auth/register"
    mobile_number = f"+1000000{str(uuid.uuid4().int)[:6]}"
    username = f"user_{uuid.uuid4().hex[:8]}"
    password = "TestPassword123!"
    register_payload = {
        "mobileNumber": mobile_number,
        "username": username,
        "password": password
    }
    try:
        register_resp = requests.post(register_url, json=register_payload, timeout=TIMEOUT)
        assert register_resp.status_code == 201, f"Registration failed: {register_resp.text}"

        # Login to receive JWT token
        login_url = f"{BASE_URL}/api/auth/login"
        login_payload = {
            "username": username,
            "password": password
        }
        login_resp = requests.post(login_url, json=login_payload, timeout=TIMEOUT)
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        login_data = login_resp.json()
        assert "token" in login_data and login_data["token"], "JWT token missing in login response"
        token = login_data["token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Create a new chat (to have a valid chat id)
        create_chat_url = f"{BASE_URL}/api/chats"

        # For participant data, we need another user - register a second user
        mobile_number_2 = f"+1000000{str(uuid.uuid4().int)[:6]}"
        username_2 = f"user_{uuid.uuid4().hex[:8]}"
        register_payload_2 = {
            "mobileNumber": mobile_number_2,
            "username": username_2,
            "password": password
        }
        register_resp_2 = requests.post(register_url, json=register_payload_2, timeout=TIMEOUT)
        assert register_resp_2.status_code == 201, f"Second user registration failed: {register_resp_2.text}"

        # Create chat with participant username_2
        create_chat_payload = {
            "participants": [username_2]
        }
        create_chat_resp = requests.post(create_chat_url, headers=headers, json=create_chat_payload, timeout=TIMEOUT)
        assert create_chat_resp.status_code == 201, f"Chat creation failed: {create_chat_resp.text}"
        chat_data = create_chat_resp.json()
        assert "id" in chat_data, "Chat ID missing in chat creation response"
        chat_id = chat_data["id"]

        # Fetch messages for the specific chat id
        get_messages_url = f"{BASE_URL}/api/chats/{chat_id}/messages"
        get_messages_resp = requests.get(get_messages_url, headers=headers, timeout=TIMEOUT)
        assert get_messages_resp.status_code == 200, f"Get messages failed: {get_messages_resp.text}"
        messages_data = get_messages_resp.json()
        # messages_data should be list or dict containing message history - just check it's a list or dict
        assert isinstance(messages_data, (list, dict)), "Messages response is not list or dict"

    finally:
        # Cleanup: delete the created chat and users if API supports deletion
        # No delete endpoints mentioned in PRD, so ignore cleanup of users
        # Attempt to delete chat if possible
        try:
            delete_chat_url = f"{BASE_URL}/api/chats/{chat_id}"
            del_resp = requests.delete(delete_chat_url, headers=headers, timeout=TIMEOUT)
            # Accept 200 or 204 or 404 (if already gone)
            assert del_resp.status_code in [200, 204, 404]
        except Exception:
            pass

test_get_api_chats_id_messages_fetch_messages()