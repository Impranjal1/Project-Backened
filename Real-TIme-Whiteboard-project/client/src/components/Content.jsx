import React from "react";
import { useNavigate } from "react-router-dom";

function Content() {
    const navigate = useNavigate();
    return (
        <div
            className="max-w-screen-xl w-full mx-auto p-4 sm:p-6 md:p-8 mt-32 sm:mt-40 min-h-[400px] rounded-2xl border-4 border-gray-300 dark:border-gray-600 shadow-2xl flex flex-col items-center"
            style={{ backgroundColor: '#e1ee90' }}
        >
            <p className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl borel-regular text-[#7a6c5d] mb-4 text-center break-words">Welcome to Dashboard</p>
            <p className="text-lg sm:text-2xl md:text-3xl lg:text-4xl borel-regular text-[#7a6c5d] mb-10 sm:mb-16 md:mb-24 text-center break-words">Develop. Monitor. Innovate.</p>
            <div className="flex flex-col sm:flex-row gap-4 w-full justify-center items-center">
                <button onClick={() => navigate('/login')} className="w-full sm:w-auto px-6 py-2 rounded bg-blue-700 text-white font-medium transition-all duration-300 hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">LogIN</button>
                <button onClick={() => navigate('/signup')} className="w-full sm:w-auto px-6 py-2 rounded bg-gray-700 text-white font-medium transition-all duration-300 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-700 dark:bg-gray-600 dark:text-white dark:hover:bg-gray-700 dark:focus:ring-gray-600">SignUP</button>
            </div>
        </div>
    );
}

export default Content;
