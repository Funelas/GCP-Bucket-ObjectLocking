import { useEffect, useState } from "react";
import Header from "./Header.jsx";
import FileList from "./FilesList.jsx";
import { loadChangesFromSession, saveChangesToSession } from "./utils/sessionUtils.js";
function App() {
  const [files, setFiles] = useState({});
  const [loading, setLoading] = useState(true);
  // const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  
  const [allFiles, setAllFiles] = useState([]); // store full list from backend
  const [page, setPage] = useState(1);
  const pageSize = 5;

  const [search, setSearch] = useState("");        // actual query
  const [searchInput, setSearchInput] = useState("");  // controlled input

  const handleSearchSubmit = () => {
    setPage(1);             // reset to page 1 for new search
    setSearch(searchInput); // apply input as actual search
  };

  useEffect(() => {
    const fetchFiles = async () => {
      setLoading(true);
      try {
        const url = new URL("http://localhost:8000/files");
        if (search) url.searchParams.append("query", search);
  
        const res = await fetch(url);
        const data = await res.json();
  
        // ✅ Re-merge unsaved new files (after loading them from session!)
        const { newFiles } = loadChangesFromSession();
        const combined = [...data.files || [], ...(newFiles || [])];
  
        setAllFiles(combined);
        setPage(1);
      } catch (err) {
        console.error("Failed to fetch files:", err);
      } finally {
        setLoading(false);
      }
    };
  
    fetchFiles();
  }, [search]);
  
  
  return (
    <>
      <Header
        searchInput={searchInput}
        setSearchInput={setSearchInput}
        onSearchSubmit={handleSearchSubmit}
      />
      <div className="bg-gray-800 p-4 w-full">
      <FileList
        loading={loading}
        allFiles={allFiles}
        setAllFiles={setAllFiles}
        page={page}
        setPage={setPage}
      />

      </div>
    </>
  );
}

export default App;
