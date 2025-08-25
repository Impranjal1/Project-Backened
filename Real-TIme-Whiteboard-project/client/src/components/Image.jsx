
import React from "react";
import bgImage from "../assets/bgimage.png";



function Image({ children }) {
    return (
        <div
            style={{
                minHeight: '100vh',
                width: '100vw',
                position: 'relative',
                backgroundImage: `url(${bgImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
            }}
        >
            <div
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    background: 'rgba(225, 238, 144, 0.4)', // #e1ee90 with 40% opacity
                    zIndex: 1,
                }}
            />
            <div style={{ position: 'relative', zIndex: 2 }}>
                {children}
            </div>
        </div>
    );
}

export default Image;