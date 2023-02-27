import time
import requests

# Read in game IDs from a file
with open("gameIds.txt", "r") as f:
    game_ids = f.readlines()
game_ids = [id.strip() for id in game_ids]

# Define the API endpoint and headers
url = "http://localhost:8080/nba/fetch-box-score"
headers = {"Content-Type": "application/json"}

# Make api calls with a request body containing the game ID and a delay of 3 seconds
with open("responses.txt", "w") as f:
    for game_id in game_ids:
        data = {"gameId": game_id}
        response = requests.post(url, headers=headers, json=data)
        f.write(response.json())
        time.sleep(5)