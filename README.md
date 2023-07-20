Inside project directory:
-execute *yarn install* to install dependencies
-execute *yarn start* to start application (both client and server side)

In *package.json* file the server ip is specified in *proxy* property, and the simultaneous start of the server and the client is specified in *start* property

About *src/data.json* (which is the client configuration file):
-*modelName* represents the file name of the model that will be used for detections. That file must be inside *public/model* directory. When modelName is changed, *src/utils/labels.json* must be updated with model classes
-*min_probability* is the confidence threshold regarding the detections
-*timeout* is the time in milliseconds that will be waited after the end of the detection of a frame to start the detection of another frame. It's used to ensure that the bounding boxes have time to be drawn on the detected frame
-*device* can be either "pc" or "phone". In the first case, when the application is started the front webcam of the PC will be started for the video, while in the second case the rear camera of the phone will be used

About *server_side/config.json* (which is the server configuration file):
-*logs_path* is the path to the directory where the frame files will be saved
-*max_logs_size* is the maximum size (in bytes) the logs path directory can have. If it is exceeded, its oldest files will be deleted in pairs of two (since a same frame is represented by two files, a json file for the metadata and a jpg file for the image) until its size respects the constraint. By default, it is 1GB