import { func } from "prop-types";
import { useContext, useState } from "react";
import { UserContext } from "./UserContext";
import axios from "axios";
import Lottie from "react-lottie";
import LoginAnimationData from "./lottie/Login.json";
import RegisterAnimationData from "./lottie/Register.json";
import Logo from "./Logo";
import LogoAnimationData from "./lottie/Logo.json";
import {toast,ToastContainer} from "react-toastify";

export default function RegisterAndLoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoginOrRegister, setIsLoginOrRegister] = useState("register");
  const { setUsername: setLoggedInUsername, setId } = useContext(UserContext);

  async function handleSubmit(ev) {
    ev.preventDefault();
    const url = isLoginOrRegister === "register" ? "/register" : "/login";
    if(username==="" || password===""){
      toast.error("Username and Password Cannot be empty!!!");
      return;
    }
    try{
      const { data } = await axios.post(url, { username, password });
      setLoggedInUsername(username);
      setId(data.id);
    }
    catch(error){
      toast.error(error)
    }
    
  }
  const LoginAnimationdefaultOptions = {
    loop: true,
    autoplay: true,
    animationData: LoginAnimationData,
    rendererSettings: {
      preserveAspectRatio: "xMidYMid slice",
    },
  };
  const RegisterAnimationdefaultOptions = {
    loop: true,
    autoplay: true,
    animationData: RegisterAnimationData,
    rendererSettings: {
      preserveAspectRatio: "xMidYMid slice",
    },
  };
  const LogoAnimationdefaultOptions = {
    loop: true,
    autoplay: true,
    animationData: LogoAnimationData,
    rendererSettings: {
      preserveAspectRatio: "xMidYMid slice",
    },
  };

  return (
    <div className="bg-blue-50">
      <ToastContainer/>
      <Lottie options={LogoAnimationdefaultOptions} height={200} width={200} />
      <div className="bg-blue-50 h-screen flex items-center font-montserrat">
        <Lottie
          options={LoginAnimationdefaultOptions}
          height={400}
          width={400}
        />
        <form className="w-64 mx-auto mb-12 bg-white p-6 rounded-lg shadow-md border-4 border-blue-400" onSubmit={handleSubmit}>
          <h2 className="text-2xl text-center font-bold mb-6">
            {isLoginOrRegister === "register" ? "Register" : "Login"}
            <Lottie
              options={RegisterAnimationdefaultOptions}
              height={100}
              width={100}
            />
          </h2>
          <input
            value={username}
            onChange={(ev) => setUsername(ev.target.value)}
            type="text"
            placeholder="Username"
            className="w-full rounded-sm p-2 mb-4 border-2 border-blue-300 focus:outline-none focus:ring focus:ring-blue-400"
          />
          <input
            value={password}
            onChange={(ev) => setPassword(ev.target.value)}
            type="password"
            placeholder="Password"
            className="w-full rounded-sm p-2 mb-4 border-2 border-blue-300 focus:outline-none focus:ring focus:ring-blue-400"
          />
          <button className="bg-blue-500 text-white block w-full rounded-lg p-2">
            {isLoginOrRegister === "register" ? "Register" : "Login"}
          </button>
          <div className="text-center mt-6">
            {isLoginOrRegister === "register" && (
              <div>
                Already a member?{" "}
                <button
                  onClick={() => setIsLoginOrRegister("login")}
                  className="text-blue-500 hover:underline"
                >
                  Login Here
                </button>
              </div>
            )}
            {isLoginOrRegister === "login" && (
              <div>
                Don't Have an Account?{" "}
                <button
                  onClick={() => setIsLoginOrRegister("register")}
                  className="text-blue-500 hover:underline"
                >
                  Register Here
                </button>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
