from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import re
import json
import base64
import requests
from datetime import datetime, timedelta
from PIL import Image
import io


# instantiate the app
app = Flask(__name__)
app.config.from_object(__name__)
CORS(app)


@app.route('/detected', methods=['POST'])
def object_detected():
    boxes = json.loads(request.form.get('boxes'))
    frameTimestamp = request.form.get('frameTimestamp')
    frameTimestamp = re.sub(r'[^\w-]', '_', frameTimestamp) #sobstitutes not valid characters with _
    image_data = request.files['image']
    

    # Specify the path where image will be saved
    os.makedirs(logs_path, exist_ok=True)
    filename = f"{frameTimestamp}.jpg"
    filepath = os.path.join(logs_path, filename)

    # Save the image file
    image_data.save(filepath)

    # Format the boxes data with indentation
    formatted_boxes = json.dumps(boxes, indent=2)

    # Save the formatted boxes as a JSON file
    boxes_filename = f"{frameTimestamp}.json"
    boxes_filepath = os.path.join(logs_path, boxes_filename)
    
    with open(boxes_filepath, 'w') as file:
        file.write(formatted_boxes)

    
    #send data to driving application
    guide_server_url = 'http://127.0.0.1:5000/del-action-goal'
    payload = {'boxes': boxes}
    files = {'image': image_data.read()}
    requests.post(guide_server_url, data=payload, files=files)

    # Check the current size of the logs directory
    current_size = get_directory_size(logs_path)

    if current_size >= max_logs_size:
        # Calculate the number of file pairs to delete
        num_pairs_to_delete = (current_size - max_logs_size) // (2 * max_logs_size) + 1
        # Delete the oldest files in pairs until the size drops below the threshold
        delete_oldest_files_in_pairs(logs_path, pairs=num_pairs_to_delete)

    return ''

   
def get_directory_size(directory):
    total_size = 0
    for path, dirs, files in os.walk(directory):
        for f in files:
            fp = os.path.join(path, f)
            total_size += os.path.getsize(fp)
    return total_size


def delete_oldest_files_in_pairs(directory, pairs=1):
    files = sorted(os.listdir(directory), key=lambda x: os.path.getmtime(os.path.join(directory, x)))
    files_to_delete = files[:pairs*2]  # Select the oldest files in pairs
    for file_name in files_to_delete:
        file_path = os.path.join(directory, file_name)
        os.remove(file_path)


@app.route('/api/logs')
def get_logs():
    condition = request.args.get('condition', '')
    timestamp = request.args.get('sessionTimeStamp', '')

    # Modify the condition value to match the modified timestamp format
    timestamp = re.sub(r'[^\w-]', '_', timestamp)

    # Get the list of files in the logs directory
    log_files = os.listdir(logs_path)

    current_datetime = datetime.now()
    hour_ago = current_datetime - timedelta(hours=1)
    day_ago = current_datetime - timedelta(days=1)

    # Filter the files based on the condition
    filtered_files = []
    for file in log_files:
        file_timestamp = file.rsplit('.', 1)[0]  # Remove the file extension

        if condition == 'session':
            # Check if the file name contains a timestamp equal to or higher than the session timestamp
            if file_timestamp >= timestamp:
                filtered_files.append(file)
        elif condition == 'hour':
            # Check if the file name contains a timestamp within the last hour
            file_datetime = datetime.strptime(file_timestamp, '%Y-%m-%dT%H_%M_%S_%fZ')
            if file_datetime >= hour_ago and file_datetime <= current_datetime:
                filtered_files.append(file)
        elif condition == 'day':
            # Check if the file name contains a timestamp within the last day
            file_datetime = datetime.strptime(file_timestamp, '%Y-%m-%dT%H_%M_%S_%fZ')
            if file_datetime >= day_ago and file_datetime <= current_datetime:
                filtered_files.append(file)
        elif condition == 'all':
            # Include all files in the directory
            filtered_files.append(file)

    # Generate thumbnails for image files
    thumbnails = []
    for file in filtered_files:
        file_extension = file.rsplit('.', 1)[1].lower()
        if file_extension == 'jpg':
            # Load the image
            image_path = f'{logs_path}/{file}'
            image = Image.open(image_path)

            # Convert the image to RGB color mode
            image = image.convert('RGB')

            # Generate the thumbnail
            thumbnail_size = (100, 100)
            image.thumbnail(thumbnail_size)

            # Convert the thumbnail to data URL
            thumbnail_data = io.BytesIO()
            image.save(thumbnail_data, format='JPEG')
            thumbnail_data.seek(0)
            thumbnail_base64 = base64.b64encode(thumbnail_data.getvalue()).decode('utf-8')

            # Append the thumbnail data to the list
            thumbnails.append({
                'file': file,
                'thumbnail': f'data:image/jpeg;base64,{thumbnail_base64}'
            })
        else:
            # For non-image files, add a placeholder
            thumbnails.append({
                'file': file,
                'thumbnail': None
            })

    return jsonify(thumbnails)


@app.route('/api/file')
def get_file():
    fileName = request.args.get('fileName', '')

    # Read the file content
    fileContent = {}
    fileExtension = fileName.rsplit('.', 1)[-1].lower()
    
    if fileExtension == 'json':
        # Handle JSON files
        with open(os.path.join(logs_path, fileName), 'r') as file:
            fileContent = json.load(file)
    elif fileExtension == 'jpg':
        # Read the image file as binary data
        with open(os.path.join(logs_path, fileName), 'rb') as file:
            fileData = file.read()

        # Encode the binary data as base64
        fileDataEncoded = base64.b64encode(fileData).decode('utf-8')

        return jsonify({'fileData': fileDataEncoded})
    else:
        # Return an error response for unsupported file types
        return jsonify({'error': 'File type not supported'})

    return jsonify(fileContent)


# Load the max logs size from the JSON file
with open('server_side/config.json') as json_file:
    config = json.load(json_file)
    logs_path=config.get('logs_path')
    max_logs_size = config.get('max_logs_size', 1000000000)  # Default to 1 GB if max_logs_size is not specified in the JSON


if __name__ == '__main__':
    app.static_folder = logs_path
    app.config['UPLOAD_FOLDER'] = logs_path
    app.run()
