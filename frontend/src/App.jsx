import { useEffect, useState } from "react";
import Header from "./Header.jsx";
import FileList from "./FilesList.jsx";

function App() {
  const [files, setFiles] = useState({});
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

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
        url.searchParams.append("page", page);
        url.searchParams.append("limit", 5);
        if (search) url.searchParams.append("query", search);

        const res = await fetch(url);
        const data = await res.json();

        setFiles(data.files);
        setPages(data.pages);
      } catch (err) {
        console.error("Failed to fetch files:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchFiles();
  }, [page, search]);

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
          files={files}
          setFiles={setFiles}
          page={page}
          setPage={setPage}
          pages={pages}
        />
      </div>
    </>
  );
}

export default App;
