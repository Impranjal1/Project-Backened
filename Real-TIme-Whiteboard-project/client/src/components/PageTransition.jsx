
import React, { useRef } from "react";
import { CSSTransition, SwitchTransition } from "react-transition-group";
import "../index.css";

function PageTransition({ children, locationKey }) {
  const nodeRef = useRef(null);
  return (
    <SwitchTransition mode="out-in">
      <CSSTransition
        key={locationKey}
        classNames="fade"
        timeout={400}
        unmountOnExit
        nodeRef={nodeRef}
      >
        <div ref={nodeRef}>{children}</div>
      </CSSTransition>
    </SwitchTransition>
  );
}

export default PageTransition;
