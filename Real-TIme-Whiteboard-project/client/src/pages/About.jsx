import React from "react";
import PageBox from "../components/PageBox.jsx";

function About() {
  return (
    <PageBox>
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <h2 className="text-6xl borel-regular text-[#7a6c5d] mb-8">About</h2>
        <div className="text-2xl borel-regular text-[#7a6c5d] text-center max-w-2xl">
          Welcome to the Dashboard! Enjoy Build Innovate and Brainstorm<br/>
          Made by Ayush!!!!!<br/>
          <br/>
          <span className="text-xl">Develop. Monitor. Innovate.</span>
        </div>
      </div>
    </PageBox>
  );
}

export default About;
