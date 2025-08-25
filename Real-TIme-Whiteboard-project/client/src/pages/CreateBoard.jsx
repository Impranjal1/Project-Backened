import React, { useState } from "react";
import PageBox from "../components/PageBox.jsx";
import { useNavigate } from "react-router-dom";

function CreateBoard({ onCreate }) {
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    if (onCreate) onCreate(title.trim());
    navigate("/dashboard", { state: { newBoardTitle: title.trim() } });
  };

  return (
    <PageBox>
      <form onSubmit={handleSubmit} className="flex flex-col items-center gap-6 w-full max-w-lg mx-auto">
        <h2 className="text-3xl borel-regular text-[#7a6c5d] mb-4">Create Board</h2>
        <input
          type="text"
          placeholder="Enter board title"
          className="p-4 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 w-full"
          value={title}
          onChange={e => { setTitle(e.target.value); setError(""); }}
        />
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <div className="flex gap-4 w-full justify-center">
          <button type="submit" className="px-6 py-2 rounded bg-blue-700 text-white font-medium hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-300">Create</button>
          <button type="button" className="px-6 py-2 rounded bg-gray-400 text-white font-medium hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-300" onClick={() => navigate(-1)}>Cancel</button>
        </div>
      </form>
    </PageBox>
  );
}

export default CreateBoard;
