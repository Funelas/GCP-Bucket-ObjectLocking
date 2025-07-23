import { useEffect, useState } from "react";
import Header from "./Header.jsx";
import FileList from "./FilesList.jsx";
import LoadingOverlay from "./LoadingOverlay.jsx";
import { loadChangesFromSession, saveChangesToSession } from "./utils/sessionUtils.js";
import dayjs from "dayjs";
function App() {

  const [loading, setLoading] = useState(true);
  // const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [currentLockFileGeneration, setCurrentLockFileGeneration] = useState();
  const [allFiles, setAllFiles] = useState([]); // store full list from backend
  const [page, setPage] = useState(1);
  const [expiredFiles , setExpiredFiles] = useState([]);

  const [search, setSearch] = useState("");        // actual query
  const [searchInput, setSearchInput] = useState("");  // controlled input

  const handleSearchSubmit = () => {
    setPage(1);             // reset to page 1 for new search
    setSearch(searchInput); // apply input as actual search
  };
  const fetchFiles = async () => {
    setLoading(true);
    try {
      const url = new URL("http://localhost:8000/files");
      if (search) url.searchParams.append("query", search);

      const res = await fetch(url);
      const data = await res.json();
      // ✅ Re-merge unsaved new files (after loading them from session!)
      const { newFiles } = loadChangesFromSession();
      
      const now = dayjs().add(30, 'second');

      // 🧹 Filter out expired & unlocked files
      const filtered = data.files.filter((details) => {
        const filename = details.name;
        const finalExpiry = details.expiration_date;
        const expiryDate = finalExpiry ? dayjs(finalExpiry) : null;

          return !(expiryDate && expiryDate.isBefore(now) && !details.temporary_hold);
        });
      const expiredAndUnlockedFiles = data.files.filter((details) => {
        const finalExpiry = details.expiration_date;
        const expiryDate = finalExpiry ? dayjs(finalExpiry) : null;
        return expiryDate && expiryDate.isBefore(now) && !details.temporary_hold;
      });
      console.log("Filtered Files: ");
      console.log(filtered);
      console.log(expiredAndUnlockedFiles);
      const combined = [...filtered || [], ...(newFiles || [])];
      setCurrentLockFileGeneration(data.currentGeneration);
      setExpiredFiles(expiredAndUnlockedFiles);
      setAllFiles(combined);
      setPage(1);
    } catch (err) {
      console.error("Failed to fetch files:", err);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchFiles();
  }, [search]);

  useEffect(() => {
    console.log("Expired Files", expiredFiles);
  }, [expiredFiles]);
  
  
  return (
    <>
      {loading && <LoadingOverlay message="Processing Files..."/>}
      <Header
        searchInput={searchInput}
        setSearchInput={setSearchInput}
        onSearchSubmit={handleSearchSubmit}
      />

      <div className="bg-gray-800 p-4 w-full">
      <FileList
        expiredFiles = {expiredFiles}
        setLoading={setLoading}
        loading={loading}
        allFiles={allFiles}
        setAllFiles={setAllFiles}
        page={page}
        setPage={setPage}
        fetchFiles = {fetchFiles}
        currentLockFileGeneration = {currentLockFileGeneration}
      />

      </div>
    </>
  );
}

export default App;
