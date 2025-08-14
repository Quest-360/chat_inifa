# Minimal Webhook (Dialogflow ES)

## Run locally
```bash
npm install
cp .env.example .env
node server.js
```

## Endpoint
POST http://localhost:8080/df-webhook

## Quick test
```bash
curl -s -X POST http://localhost:8080/df-webhook -H "Content-Type: application/json" -d '{
  "queryResult": {
    "intent": { "displayName": "Find Roles" },
    "parameters": { "practice": "Consulting", "location": "Bengaluru" }
  }
}'
```
