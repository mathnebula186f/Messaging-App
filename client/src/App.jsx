import axios from "axios"
import Routess from "./Routess";
import { UserContextProvider } from "./UserContext";

//console.log("hi2");
function App() {
  axios.defaults.baseURL = "https://messaging-app-azure.vercel.app/";
  axios.defaults.withCredentials=true;
  //console.log("hey")
  return (
    <UserContextProvider>
      <Routess />
    </UserContextProvider>
  );
}

export default App
