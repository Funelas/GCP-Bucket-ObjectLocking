import { useEffect, useState } from "react";
import Header from "./components/Header.jsx";
import FileList from "./components/FilesList.jsx";
import LoadingOverlay from "./components/LoadingOverlay.jsx";
import BucketSelector from "./components/BucketSelector.jsx";
import dayjs from "dayjs";
import { clearAllBucketSessions, loadChangesFromSession } from "./utils/sessionUtils.js";


function App() {
  const [bucketName, setBucketName] = useState("tempbucket24");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [buckets, setBuckets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [allFiles, setAllFiles] = useState([]);
  const [expiredFiles, setExpiredFiles] = useState([]);
  
  const fetchFiles = async () => {
    setLoading(true);
    try {
      const url = new URL("http://localhost:8000/files");
      if (search) url.searchParams.append("query", search);
      url.searchParams.append("bucket", bucketName);

      const res = await fetch(url);
      const data = await res.json();

      const { newFiles } = loadChangesFromSession(bucketName);
      const now = dayjs().add(30, "second");

      const filtered = data.files.filter((details) => {
        const expiry = details.expiration_date ? dayjs(details.expiration_date) : null;
        return !(expiry && expiry.isBefore(now) && !details.temporary_hold);
      });

      const expired = data.files.filter((details) => {
        const expiry = details.expiration_date ? dayjs(details.expiration_date) : null;
        return expiry && expiry.isBefore(now) && !details.temporary_hold;
      });

      const filteredFilenames = new Set(filtered.map((file) => file.name));
      const uniqueNewFiles = (newFiles || []).filter(f => !filteredFilenames.has(f.name));

      setAllFiles([...filtered, ...uniqueNewFiles]);
      setExpiredFiles(expired);
    } catch (err) {
      console.error("Failed to fetch files:", err);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchFiles();
  }, [bucketName, search]);

  useEffect(() => {
    const fetchBuckets = async () => {
      setLoading(true);
      try {
        const res = await fetch("http://localhost:8000/get-buckets");
        const data = await res.json();
        setBuckets(data);
      } catch (err) {
        console.error("Failed to fetch buckets", err);
      } finally {
        setLoading(false);
      }
    };

    fetchBuckets();
  }, []);

  // const { allFiles, expiredFiles, loading, setLoading, setAllFiles, fetchFiles } = useFiles(bucketName, search);
  // const { buckets } = useBuckets();

  const handleSearchSubmit = () => {
    setPage(1);
    setSearch(searchInput);
  };

  useEffect(() => {
    clearAllBucketSessions();
  }, []);

  return (
    <>
      {loading && <LoadingOverlay message="Processing Files..." />}

      <Header
        searchInput={searchInput}
        setSearchInput={setSearchInput}
        onSearchSubmit={handleSearchSubmit}
      />

      <div className="bg-gray-800 p-4 w-full">

        <FileList
          fetchFiles={fetchFiles}
          expiredFiles={expiredFiles}
          setLoading={setLoading}
          loading={loading}
          allFiles={allFiles}
          setAllFiles={setAllFiles}
          page={page}
          setPage={setPage}
          bucketName={bucketName}
          buckets={buckets}
          setBucketName = {setBucketName}
        />
      </div>
    </>
  );
}

export default App;
