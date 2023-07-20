import React, { useState, useRef, useEffect } from "react";
import { Tensor, InferenceSession } from "onnxruntime-web";
import Loader from "./components/loader";
import { detectImage } from "./utils/detect";
import { download } from "./utils/download";
import { Link } from 'react-router-dom';
import "./style/App.css";
import jsonData from './data.json';

const App = ({sessionTimeStamp}) => {
  const [loading, setLoading] = useState({ text: "Loading OpenCV.js", progress: null });
  const videoRef = useRef(null);
  const [processing, setProcessing] = useState(false); // detection elaboration state
  const canvasRef = useRef(null);

  // Configs
  const modelName = jsonData.modelName;
  const modelInputShape = [1, 3, jsonData.modelWidth, jsonData.modelHeight];
  const topk = 100;
  const iouThreshold = 0.40;
  const scoreThreshold = jsonData.min_probability;
  const timeOut = jsonData.timeout; //time to wait after each detection to draw bounding boxes
  
  // wait until opencv.js initialized
  const initializeOpenCV = async () => {
    const baseModelURL = `${process.env.PUBLIC_URL}/model`;

    // create session
    const arrBufNet = await download(
      `${baseModelURL}/${modelName}`, // url
      ["Loading YOLOv8 Segmentation model", setLoading] // logger
    );
    const yolov8 = await InferenceSession.create(arrBufNet);
    const arrBufNMS = await download(
      `${baseModelURL}/nms-yolov8.onnx`, // url
      ["Loading NMS model", setLoading] // logger
    );
    const nms = await InferenceSession.create(arrBufNMS);

    // warmup main model
    setLoading({ text: "Warming up model...", progress: null });
    const tensor = new Tensor(
      "float32",
      new Float32Array(modelInputShape.reduce((a, b) => a * b)),
      modelInputShape
    );
    await yolov8.run({ images: tensor });

    const newSession = { net: yolov8, nms:nms };
    setLoading(null);
    startVideo(newSession)  //start video
  };
  

  const startVideo = (session) => {

    let videoConstraints = { video: true };
    if (jsonData.device === "phone") 
        videoConstraints = { video: { facingMode: { exact: 'left' } }, }; //start phone rear camera
    navigator.mediaDevices
      .getUserMedia(videoConstraints)
      .then(stream => {
        let video = videoRef.current;
        video.srcObject = stream;
        
        video.onloadedmetadata = () => {
          video.play();
          requestAnimationFrame(() => processVideoFrame(session)); //start frames detection
        };  
      })
      .catch(err => {
        console.error("error:", err);
      });
  }; 
  
  const processVideoFrame = async (session) => {
    if (!processing) { // check if the detectImage is free for processing
      setProcessing(true); // set processing state to true
    
      const imageDataURL = await grabFrame();
      const imageElement = document.createElement('img');
      imageElement.src = imageDataURL;
      
      // processes the current frame
      imageElement.onload = () => {
        detectImage(
          imageElement,
          canvasRef.current,
          session,
          topk,
          iouThreshold,
          scoreThreshold,
          modelInputShape
        ).finally(() => {
          setProcessing(false); // set processing state to false after processing

          setTimeout(() => {
            requestAnimationFrame(() => processVideoFrame(session));
          }, timeOut);
        });
      };  
    } else {
        requestAnimationFrame(() => processVideoFrame(session));
    }
  };
  
  //get imageDataUrl of current frame
  const grabFrame = () => {
    return new Promise((resolve, reject) => {
      // Get the video element
      const video = document.querySelector('video');
  
      // Create a MediaStreamTrack object from the video element
      const track = video.srcObject.getVideoTracks()[0];
  
      // Create an ImageCapture object from the MediaStreamTrack
      const imageCapture = new ImageCapture(track);
  
      // Capture a frame from the video
      imageCapture.grabFrame()
        .then(imageBitmap => {
          // Convert the captured frame to a <canvas> element
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.width = canvasRef.current.width;
          canvas.height = canvasRef.current.height;
          context.drawImage(imageBitmap, 0, 0, canvasRef.current.width, canvasRef.current.height);
  
          // Get the image data from the <canvas> as a Data URL or perform any other desired operations
          const imageDataURL = canvas.toDataURL();
  
          // Resolve the promise with the imageDataURL
          resolve(imageDataURL);
        })
        .catch(error => {
          console.error('Error capturing frame: ', error);
          reject(error);
        });
    });
  };

  useEffect(() => {
    initializeOpenCV();
    return () => {
      // Reset the loading state when the component unmounts
      setLoading(null);
    };
  }, []);


  return (
    <div className="App">
      {loading && (
        <Loader>
          {loading.progress ? `${loading.text} - ${loading.progress}%` : loading.text}
        </Loader>
      )}

      <Link to={`/logs/${sessionTimeStamp}`} className="buttonLogs">Logs</Link>

      <div className="content">
        <video 
          width={modelInputShape[2]}
          height={modelInputShape[3]}
          ref={videoRef} 
          style={{ display: "none" }}
        />
        <canvas
          id="canvas"
          width={modelInputShape[2]}
          height={modelInputShape[3]}
          ref={canvasRef}
        />
      </div> 

    </div>
  );
};

export default App;