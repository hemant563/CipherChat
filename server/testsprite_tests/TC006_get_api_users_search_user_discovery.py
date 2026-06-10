import requests
import uuid

BASE_URL = "http://localhost:5001"
TIMEOUT = 30

def test_get_api_users_search_user_discovery():
    # Helper to register user
    def register_user(mobile, username, password):
        url = f"{BASE_URL}/api/auth/register"
        payload = {
            "mobile": mobile,
            "username": username,
            "password": password
        }
        resp = requests.post(url, json=payload, timeout=TIMEOUT)
        resp.raise_for_status()
        return resp

    # Helper to login user
    def login_user(username, password):
        url = f"{BASE_URL}/api/auth/login"
        payload = {
            "username": username,
            "password": password
        }
        resp = requests.post(url, json=payload, timeout=TIMEOUT)
        resp.raise_for_status()
        return resp.json()["token"]

    user_suffix = uuid.uuid4().hex[:8]
    mobile = f"999000{user_suffix[:4]}"
    username = f"searchuser{user_suffix}"
    password = "StrongP@ssw0rd!"

    # Register and login user to get valid JWT token
    try:
        register_resp = register_user(mobile, username, password)
        assert register_resp.status_code == 201

        token = login_user(username, password)
        assert token and isinstance(token, str)

        headers = {"Authorization": f"Bearer {token}"}

        # We need a user to search for - create another user to ensure a match
        search_user_mobile = f"888000{user_suffix[4:]}"
        search_user_username = f"matchuser{user_suffix}"
        search_user_password = "AnotherP@ss1!"

        register_resp2 = register_user(search_user_mobile, search_user_username, search_user_password)
        assert register_resp2.status_code == 201

        # Perform search with a query that matches the created user
        search_url = f"{BASE_URL}/api/users/search"
        params = {"query": search_user_username[:6]}
        search_resp = requests.get(search_url, headers=headers, params=params, timeout=TIMEOUT)

        assert search_resp.status_code == 200
        data = search_resp.json()
        assert isinstance(data, list)
        # At least one user should match
        assert any(search_user_username == user.get("username") for user in data)

    finally:
        # Cleanup: delete the two created users if delete endpoints exist (not stated in PRD)
        # So no API for deletion provided; no cleanup possible for users - left out as per spec
        pass

test_get_api_users_search_user_discovery()