import requests

url = "http://127.0.0.1:8000/predict"

data = {
    "review": "Amazing product! Must buy. Best purchase ever!",
    "rating": 5
}

response = requests.post(url, json=data)

print(response.status_code)
print(response.text)