import { useEffect, useState, createContext } from "react";
import type { Schema } from "../amplify/data/resource";
import { generateClient } from "aws-amplify/data";
import ChatInterface from "./ChatInterface";
import "./App.css";
import { capitalize } from "./assets/functions"
// import ChatShell from "./ChatShell";
import Chat from "./Chat"
import SalesForceChat from "./SalesForceChat";

const client = generateClient<Schema>();

export const AppContext = createContext<any>({});

// create context

function App() {
  const queryParams = new URLSearchParams(window.location.search);
  const language = queryParams.get("language");
  const email = queryParams.get("email");
  const displayName = queryParams.get("displayName");
  return (
    <div className="App">
      <AppContext.Provider value={{ language, email, displayName }}>
        {/* <SalesForceChat prevMessages={[]} /> */}
        {/* <ChatInterface /> */}
        <Chat />
        {/* <ChatShell /> */}
      </AppContext.Provider>
    </div>
  );
}

export default App;
