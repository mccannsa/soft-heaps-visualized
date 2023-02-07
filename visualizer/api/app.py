from flask import Flask
from flask import send_from_directory
from flask_cors import CORS

app = Flask(__name__)

# WARNING: the following CORS setting is for development purposes and should
#          be changed to allow only specific origins to access the api
#          before deploying
# CORS(app, origins=["origin1","origin2"])
CORS(app)

@app.route("/greeting")
def greeting():
  return { "greeting" : "Hello from Flask!" }
  
@app.route("/scripts/softheap")
def softheap():
  return send_from_directory('scripts','softheap.py')
