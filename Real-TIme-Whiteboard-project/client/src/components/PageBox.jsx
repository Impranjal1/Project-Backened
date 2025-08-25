import React from "react";

function PageBox({ children }) {
    return (
        <div
            className="max-w-screen-xl w-full mx-auto p-4 sm:p-6 md:p-8 mt-32 sm:mt-40 min-h-[400px] rounded-2xl border-4 border-gray-300 dark:border-gray-600 shadow-2xl flex flex-col items-center"
            style={{ backgroundColor: '#e1ee90' }}
        >
            {children}
        </div>
    );
}

export default PageBox;
