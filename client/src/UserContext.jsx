import { func } from "prop-types";
import { createContext, useEffect } from "react";
import { useState } from "react";
import axios from "axios";

export const UserContext =createContext({

});

export function UserContextProvider({children}){
    const [username,setUsername]=useState(null);
    const [id,setId] = useState(null);
    const [token,setToken]=useState(null)

    const isLoggedIn=(async ()=>{
        const username1=await localStorage.getItem("username");
        if(username1){
            setUsername(username1);
        }
        const id1=await localStorage.getItem("id");
        if(id1){
            setId(id);
        }
        const token1=await localStorage.getItem("token");
        if(token1){
            setToken(token1);
        }
    })
    useEffect(() =>{
        isLoggedIn();
    },[]);
    const logout = async()=>{
        localStorage.removeItem("username");
        setUsername(null);
        localStorage.removeItem("id");
        setId(null);
        localStorage.removeItem("token");
        setToken(null);
    }
    return (
        <UserContext.Provider value={{username ,setUsername,id,setId,logout,token,setToken}}>
        {children}
        </UserContext.Provider>
    )
}