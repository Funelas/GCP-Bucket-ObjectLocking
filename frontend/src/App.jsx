import { useEffect, useState } from "react";
import Header from "./Header.jsx";
import FileList from "./FilesList.jsx";
import LoadingOverlay from "./LoadingOverlay.jsx";
import { loadChangesFromSession, clearAllBucketSessions} from "./utils/sessionUtils.js";
import BucketSelector from "./BucketSelector.jsx";
import dayjs from "dayjs";
function App() {

  const [loading, setLoading] = useState(true);
  // const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  // const [currentLockFileGeneration, setCurrentLockFileGeneration] = useState();
  const [allFiles, setAllFiles] = useState([]); // store full list from backend
  const [page, setPage] = useState(1);
  const [expiredFiles , setExpiredFiles] = useState([]);

  const [search, setSearch] = useState("");        // actual query
  const [searchInput, setSearchInput] = useState("");  // controlled input
  const [bucketName, setBucketName] = useState("tempbucket24");
  const [buckets, setBuckets] = useState([]);
  const handleSearchSubmit = () => {
    setPage(1);             // reset to page 1 for new search
    setSearch(searchInput); // apply input as actual search
  };
  useEffect(()=>{
    clearAllBucketSessions()
  }, [])
  
  const fetchFiles = async () => {
    setLoading(true);
    try {
      const url = new URL("http://localhost:8000/files");
      if (search) url.searchParams.append("query", search);
      url.searchParams.append("bucket", bucketName);

      const res = await fetch(url);
      const data = await res.json();
      // ✅ Re-merge unsaved new files (after loading them from session!)
      const { newFiles, lockChanges } = loadChangesFromSession(bucketName);
      const { newFilesTemp, lockChangesTemp} = loadChangesFromSession("tempbucket24");
      const now = dayjs().add(30, 'second');
      console.log("Temp24 New Files: ", newFilesTemp);
      console.log("Temp24 Lock Changes: ", lockChangesTemp);
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
      // ✅ Filter newFiles to only include those not in filtered
      const filteredFilenames = new Set(filtered.map((file) => file.name));
      const uniqueNewFiles = (newFiles || []).filter(
        (file) => !filteredFilenames.has(file.name)
      );
      const combined = [...filtered || [], ...(uniqueNewFiles || [])];
      // setCurrentLockFileGeneration(data.currentGeneration);
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
    const fetchBuckets = async () => {
      setLoading(true);
      try{
        const url = new URL("http://localhost:8000/get-buckets")
        const res = await fetch(url);
        const data = await res.json();
        console.log(data);
        setBuckets(data);
      } finally{
        setLoading(false)
      }
    };
    fetchBuckets()
  }, [])

  useEffect(() => {
    fetchFiles();
  }, [search, bucketName]);


  
  
  return (
    <>
      {loading && <LoadingOverlay message="Processing Files..."/>}
      <Header
        searchInput={searchInput}
        setSearchInput={setSearchInput}
        onSearchSubmit={handleSearchSubmit}
      />

      <div className="bg-gray-800 p-4 w-full">
      <BucketSelector buckets= {buckets} selectedBucket={bucketName} onSelect={setBucketName} />
      <FileList
        expiredFiles = {expiredFiles}
        setLoading={setLoading}
        loading={loading}
        allFiles={allFiles}
        setAllFiles={setAllFiles}
        page={page}
        setPage={setPage}
        fetchFiles = {fetchFiles}
        // currentLockFileGeneration = {currentLockFileGeneration}
        bucketName = {bucketName}
        buckets = {buckets}
      />

      </div>
    </>
  );
}

export default App;
