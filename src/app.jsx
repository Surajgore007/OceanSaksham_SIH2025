import React from "react";
import Routes from "./Routes";
import LocationProvider from "./LocationProvider";

function App() {
  return (
    <LocationProvider>
      <Routes />
    </LocationProvider>
  );
}

export default App;