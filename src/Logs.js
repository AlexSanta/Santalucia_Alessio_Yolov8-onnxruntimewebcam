import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import "./style/Logs.css";


const Logs = () => {

  const [selectedValue, setSelectedValue] = useState('');
  const [fileNames, setFileNames] = useState([]);
  const [thumbnails, setThumbnails] = useState([]);
  const { sessionTimeStamp } = useParams();

  useEffect(() => { //called when page loads and when selectedValue changes
    getServerLogs(sessionTimeStamp);
  }, [selectedValue]);

  const handleDropdownChange = (event) => {
    setSelectedValue(event.target.value);
  };

  const getServerLogs = (sessionTimeStamp) => {
    // Map the selected value to the appropriate condition
    let condition;
    switch (selectedValue) {
      case "Ultima_sessione":
        condition = "session";
        break;
      case "Ultima_ora":
        condition = "hour";
        break;
      case "Ultimo_giorno":
        condition = "day";
        break;
      case "Sempre":
        condition = "all";
        break;
      default:
        condition = "session";  
    }

    const url = `/api/logs?condition=${condition}&sessionTimeStamp=${sessionTimeStamp}`;

    // Make a request to the backend to retrieve the files
    fetch(url)
      .then((response) => response.json())
      .then((data) => {
        // Update the state with the retrieved file names
        setFileNames(data.map((item) => item.file));
        setThumbnails(data);
      })
      .catch((error) => {
        console.error("Error fetching server logs:", error);
      });
  };

  const handleRowClick = (fileName) => {
    const fileExtension = fileName.split('.').pop().toLowerCase();
  
    if (fileExtension === 'jpg') {
      // Make a request to the backend to get the image file data
      fetch(`/api/file?fileName=${fileName}`)
        .then((response) => response.json())
        .then((data) => {
          const imageData = data.fileData;
    
          // Create a data URL with the base64 encoded image data
          const imageUrl = `data:image/jpeg;base64,${imageData}`;
    
          // Calculate the center position of the screen
          const screenWidth = window.screen.width;
          const screenHeight = window.screen.height;
          const windowWidth = 800; // Set the desired width of the pop-up window
          const windowHeight = 600; // Set the desired height of the pop-up window
          const left = Math.max((screenWidth - windowWidth) / 2, 0);
          const top = Math.max((screenHeight - windowHeight) / 2, 0);
    
          // Open the pop-up window in the top center position
          const popupWindow = window.open('', 'popup', `width=${windowWidth},height=${windowHeight},top=${top},left=${left}`);
    
          // Set the title as the file name
          popupWindow.document.title = fileName;
    
          // Create an <img> element with the data URL
          const imageElement = document.createElement('img');
          imageElement.src = imageUrl;
          imageElement.alt = fileName;
          imageElement.style.maxWidth = '100%';
          imageElement.style.maxHeight = '100%';
          imageElement.style.display = 'block';
          imageElement.style.margin = 'auto';
    
          // Append the <img> element to the pop-up window's document body
          popupWindow.document.body.appendChild(imageElement);
        })
        .catch((error) => {
          console.error("Error fetching image file data:", error);
        });
    } else if (fileExtension === 'json') {
    // Make a request to the backend to fetch the file content
    fetch(`/api/file?fileName=${fileName}`)
      .then((response) => response.json())
      .then((fileContent) => {
        // Calculate the top and left positions for the pop-up window
        const screenWidth = window.screen.width;
        const screenHeight = window.screen.height;
        const popupWidth = 600;
        const popupHeight = 400;
        const top = Math.max(0, (screenHeight - popupHeight) / 2);
        const left = Math.max(0, (screenWidth - popupWidth) / 2);
        
        // Open the pop-up window and position it at the top center
        const popupWindow = window.open('', 'popup', `width=${popupWidth},height=${popupHeight},top=${top},left=${left}`);
        
        // Set the file name as the title of the pop-up window
        popupWindow.document.title = fileName;
        
        // Write the JSON file content to the pop-up window document
        popupWindow.document.write(`
          <html>
            <head>
              <title>${fileName}</title>
                <style>
                  body {
                    font-size: 16px;
                  }
                </style>
            </head>
            <body>
              <pre>${JSON.stringify(fileContent, null, 2)}</pre>
            </body>
          </html>
        `);
      })
      .catch((error) => {
        console.error("Error fetching file content:", error);
      });
    }
  };

  const getDateFromFileName = (fileName) => {
    const date = fileName.split("T")[0];
    return date;
  };
  
  const getHoursFromFileName = (fileName) => {
    const time = fileName.split("T")[1].split("_");
    const hours = time.slice(0, 3).join(":");
    const milliseconds = time[3].split(".")[0].replace(/\D/g, "");
    return `${hours}:${milliseconds}`;
  };
  
  return (
    <div className="Logs">

      <h1>Server Logs</h1>

      <div className="dropdown-container">
      
        <p>Seleziona il periodo di tempo del quale vuoi vedere i logs del server: </p>

        <select value={selectedValue} onChange={handleDropdownChange}>
          <option value="Ultima_sessione">Sessione corrente</option>
          <option value="Ultima_ora">Ultima ora</option>
          <option value="Ultimo_giorno">Ultimo giorno</option>
          <option value="Sempre">Sempre</option>
        </select>

      </div>  

      <div className="logs-table-container">
        <table className="logs-table">
          {/* Table headers */}
          <thead>
            <tr>
              <th colSpan="4">File loggati dal server</th>
            </tr>
            <tr>
              <th>Data</th>
              <th>Orario</th>
              <th>File JSON</th>
              <th>Frame</th>
            </tr>
          </thead>
          <tbody className="logs-table-body">
            {fileNames.reverse().map((fileName, index) => {
            // Skip the odd-indexed elements (JPG files)
            if (index % 2 !== 0) {
              return null;
            }

            const jsonFileName = fileName;
            const jpgFileName = fileNames[index + 1];

            // Get the file extensions
            const jsonExtension = jsonFileName.split(".").pop().toLowerCase();

            // Get the thumbnail URL based on the file extension
            const jsonThumbnail = jsonExtension === "json" ? `${process.env.PUBLIC_URL}/json_icon.PNG` : null;
            const jpgThumbnail = thumbnails.find((item) => item.file === jpgFileName)?.thumbnail;

            return (
              <tr key={index}>
                <td>{getDateFromFileName(jsonFileName)}</td>
                <td>{getHoursFromFileName(jsonFileName)}</td>
                <td>
                  {jsonThumbnail && (
                    <img
                      width="65"
                      height="65"
                      className="thumbnail"
                      src={jsonThumbnail}
                      alt="JSON Thumbnail"
                      onClick={() => handleRowClick(jsonFileName)}
                    />
                  )}
                </td>
                <td>
                  {jpgThumbnail && (
                    <img
                      width="65"
                      height="65"
                      className="thumbnail"
                      src={jpgThumbnail}
                      alt="Frame Thumbnail"
                      onClick={() => handleRowClick(jpgFileName)}
                    />
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
        </table>
      </div>

      <Link to="/yolov8-onnxruntime-web" className="buttonVideo">Video</Link>
    </div>
  );
};

export default Logs;