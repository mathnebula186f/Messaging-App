import axios from "axios"
import Routess from "./Routess";
import { UserContextProvider } from "./UserContext";

//console.log("hi2");
function App() {
  axios.defaults.baseURL = "https://server1-zkd5.onrender.com";
  axios.defaults.withCredentials=true;
  //console.log("hey")
  return (
    <UserContextProvider>
      <Routess />
    </UserContextProvider>
  );
}

export default App
