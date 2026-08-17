import urllib.request
import socket

def test_hosts():
    print("--- Testing Connection to 127.0.0.1 vs localhost ---")
    
    # 127.0.0.1 test
    try:
        req = urllib.request.Request("http://127.0.0.1:8000/employers")
        with urllib.request.urlopen(req) as resp:
            print("[SUCCESS] Connected to http://127.0.0.1:8000/employers - Status:", resp.status)
    except Exception as exc:
        print("[FAIL] Could not connect to http://127.0.0.1:8000/employers:", exc)

    # localhost test
    try:
        req = urllib.request.Request("http://localhost:8000/employers")
        with urllib.request.urlopen(req) as resp:
            print("[SUCCESS] Connected to http://localhost:8000/employers - Status:", resp.status)
    except Exception as exc:
        print("[FAIL] Could not connect to http://localhost:8000/employers:", exc)

if __name__ == "__main__":
    test_hosts()
