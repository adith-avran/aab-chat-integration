import { createContext } from "react";
// import ChatInterface from "./ChatInterface";
import "./App.css";
// import { capitalize } from "./assets/functions"
// import ChatShell from "./ChatShell";
import Chat from "./Chat";
// import ChatDisclaimer from "./ChatDisclaimer";
// import SalesForceChat from "./SalesForceChat";

export const AppContext = createContext<any>({});

// create context

function App() {
  const queryParams = new URLSearchParams(window.location.search);
  // const [accepted, setAccepted] = useState(false);

  const language = queryParams.get("language");
  const email = queryParams.get("email");
  const displayName = queryParams.get("displayName");
  return (
    <div className="App">
      <AppContext.Provider value={{ language, email, displayName }}>
        {/* <SalesForceChat prevMessages={[]} /> */}
        {/* <ChatInterface /> */}
        {/* {!accepted && <ChatDisclaimer onAccept={() => {setAccepted(true)}} />} */}
        {/* {accepted && <Chat />} */}

        <Chat />
        {/* <ChatShell /> */}
      </AppContext.Provider>
    </div>
  );
}

export default App;
