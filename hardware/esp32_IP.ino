#include <WiFi.h>
#include <HTTPClient.h>

const char* ssid = "";

const char* password = "";

const char* serverURL = "http:// 10.227.105.129:5001/door-open";

const int reedPin = 27;

int previousState = HIGH;

void setup() {

  Serial.begin(115200);
  pinMode(reedPin, INPUT_PULLUP);

  // Connect to Wi-Fi
  Serial.println("Connecting to WiFi...");
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();
  Serial.println("WiFi connected!");

  Serial.print("ESP32 IP address: ");
  Serial.println(WiFi.localIP());

}

void loop() {

  int currentState = digitalRead(reedPin);

  
  if (previousState == LOW && currentState == HIGH) {
    delay(300); //Prevent the reed switch from triggering twice

    Serial.println();
    Serial.println("DOOR OPENED");

    // Check Wi-Fi
    if (WiFi.status() == WL_CONNECTED) {

      Serial.println("Sending signal to PresenX...");

      HTTPClient http;

      // Connect to Flask server
      http.begin(serverURL);

      // Tell Flask that we are sending JSON
      http.addHeader("Content-Type", "application/json");

      
      String data = "{\"message\":\"Door opened\"}";

      
      int responseCode = http.POST(data);

      
      Serial.print("HTTP Response Code: ");
      Serial.println(responseCode);

      
      String response = http.getString();

      Serial.print("Server Response: ");
      Serial.println(response);

      
      http.end();

    } else {

      Serial.println("WiFi disconnected!");
    }
  }
  previousState = currentState;

  delay(100);
}