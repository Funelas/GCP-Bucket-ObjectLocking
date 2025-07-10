import { useEffect, useState } from "react";
import Header from "./Header.jsx";
import FileList from "./FilesList.jsx";

function App() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://localhost:8000/files")
      .then((res) => res.json())
      .then((data) => {
        setFiles(data);
        setLoading(false);
        console.log(data);
      })
      .catch((err) => {
        console.error("Failed to fetch files:", err);
        setLoading(false);
      });
  }, []);

  return (
    <>
    <Header />
    <div className="bg-gray-800 p-4 w-full">
      <FileList loading={loading} files={files} setFiles={setFiles} />
    </div>
    
    
    </>
      
      
  );
}

export default App;
