import React from "react";
import Routes from "./Routes";
import LocationProvider from "./LocationProvider";
import { LanguageProvider } from "./context/LanguageContext";

function App() {
  return (
    <LanguageProvider>
      <LocationProvider>
        <Routes />
      </LocationProvider>
    </LanguageProvider>
  );
}

export default App;
