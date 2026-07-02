import socket

# Check if port 6379 is open locally
s = socket.socket(socket.socket().family, socket.socket().type)
s.settimeout(2)
try:
    s.connect(("127.0.0.1", 6379))
    print("Redis port 6379 is OPEN")
    s.close()
except Exception as e:
    print(f"Redis port 6379 is CLOSED: {e}")

try:
    import redis
    print("python-redis package is installed")
except ImportError:
    print("python-redis package is NOT installed")
