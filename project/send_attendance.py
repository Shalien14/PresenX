import requests

url = "http://localhost:5000/employee_atten/attendance"

data = {
    "employeeId": "EMP001",
    "status": "EXIT",
    "date": "2026-09-09",
    "time": "08:30:15"
}

response = requests.post(url, json=data)

print("Status code:", response.status_code)
print("Response text:", response.text)