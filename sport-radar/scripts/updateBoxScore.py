import time
import requests
import json

# Read in game IDs from a file
with open("gameIds.txt", "r") as f:
    game_ids = f.readlines()
game_ids = [id.strip() for id in game_ids]

# Define the API endpoint and headers
url = "http://localhost:8080/games/fetch-box-score"
headers = {"Content-Type": "application/json"}
api_key = "94yvfavqruvmk5vfev4tc5vs"

try:
    with open("responses.txt", "w") as f:
        for game_id in game_ids:
            data = {"gameId": game_id, "apiKey": api_key}
            response = requests.post(url, headers=headers, json=data)
            if response.status_code == 200:
                response_str = json.dumps(response.json()) + "\n"
                f.write(response_str)
                game_ids.remove(game_id)
            else:
                break
            time.sleep(1)
except Exception as e:
    print(e)

# Save the updated list of game IDs to the same file
with open("gameIds.txt", "w") as f:
    f.write("\n".join(game_ids))