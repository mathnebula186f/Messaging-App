import { useContext,useEffect } from "react";
import RegisterAndLoginForm from "./RegisterAndLoginForm";
import { UserContext } from "./UserContext";
import Chat from "./Chat";
import {Routes ,Route} from 'react-router-dom';

export default function Routess() {
    const {username,id,setUsername,setId,setToken}= useContext(UserContext);

    useEffect(() =>{
        const username1=localStorage.getItem("username");
        if(username1){
            setUsername(username1);
        }
        const id1=localStorage.getItem("id");
        if(id1){
            setId(id);
        }
        const token1=localStorage.getItem("token");
        if(token1){
            setToken(token1);
        }
    },[]);
    
    
    if(username){
        return <Chat />; 
    }

    return(
        <RegisterAndLoginForm/>
    ); 
}
