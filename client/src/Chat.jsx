import { func } from "prop-types";
import { useContext, useEffect, useRef, useCallback } from "react";
import { useState } from "react";
import Avatar from "./Avatar";
import Logo from "./Logo";
import { UserContext } from "./UserContext";
import {_} from 'lodash';
import axios from "axios";
import {Navigate, useNavigate} from 'react-router-dom';
import { useSocket } from "./SocketProvider";
import peer from "./peer";
import ReactPlayer from 'react-player';
import BackGroundImage from "./BackGroundImage";

export default function Chat() {
  const[ws,setWs]=useState(null);
  const [onlinePeople,setOnlinePeople]=useState({});
  const [selectedUserId,setSelectedUserId]=useState(null);
  const {username,id}=useContext(UserContext)
  const [newMessageText,setnewMessageText]=useState('');
  const [messages,setMessages]= useState([]);
  const divUnderMessages =useRef();
  const [allPeople,setAllPeople]=useState({});


  function connectToWs(){
    const ws = new WebSocket("ws://localhost:4000");
    setWs(ws);
    ws.addEventListener("message", handleMessage);
    ws.addEventListener("close",()=> {
      setTimeout(()=>{
      console.log("Disconnected?Trying to reconnect....");
      connectToWs();
    },1000);
    });
  }

  useEffect(() => {
    connectToWs();
  },[]);

  useEffect(()=>{
    axios.get('/ShowAllPeople').then(res =>{
      setAllPeople(res.data);
    });
  },[]);
  function showOnlinePeople(peopleArray){
    const people ={};
    peopleArray.forEach(({userId,username}) =>{
        people[userId]=username;
    });
    //console.log("Here are ll the people" +people);
    setOnlinePeople(people);
  }
  function handleMessage(ev){
    const messageData=JSON.parse(ev.data);
    console.log("Here is the messageData===="+messageData.text);
    //console.log("Im here");
    console.log("hiiii==="+{ev,messageData});
    if('online' in messageData){
        showOnlinePeople(messageData.online);
    }
    
    else if('text' in messageData){
      //console.log("Message came="+messageData.text);
      console.log('Hoo');
      setMessages(prev => ([...prev,{...messageData}]));
      // this.forceUpdate();
      console.log('Here is the messageData snedeer=='+{...messageData}._id);
    }
    console.log('gone');
    //console.log(ev.data);
    // ev.data.text().then(messageString =>{
    //     console.log(messageString);
    // });
    //console.log('new Message',ev);
  }
  function selectContact(userId){
    //console.log("clicked user id"+ userId);
    setSelectedUserId(userId);
  }

  function sendMessage(ev){
    ev.preventDefault();
    //console.log("sending message");
    ws.send(JSON.stringify({
        recipient : selectedUserId,
        text: newMessageText,
    }));
    console.log("Message you typed= "+newMessageText);
    setnewMessageText('');
    setMessages( prev => ([...prev,{
      text :newMessageText,
      sender:id,
    recipient:selectedUserId,
    _id:Date.now(),
  }]));
    console.log("Message has been sent by form");
    // location.reload();
    this.forceUpdate();
  }

  useEffect(() => {
    const div = divUnderMessages.current;
    if(div){
      div.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  },[messages]);

  useEffect(() =>{
    if(selectedUserId){
      axios.get('/messages/'+selectedUserId).then(res =>{
        // const {data}=res;

        setMessages(res.data);
      });
    }
  },[selectedUserId]);


  const onlinePeopleExclOurUser= {...onlinePeople};
  delete onlinePeopleExclOurUser[id];

  const messagesWithoutDupes = _.uniqBy(messages,'_id');
  //console.log(messagesWithoutDupes);


  //video 

  const socket = useSocket();
  const navigate = useNavigate();
  const room=1;
  const [RoomPageOpened,setRoomPageOpened]=useState(false);
  const [remoteSocketId, setRemoteSocketId] = useState(null);
  const [myStream, setMyStream] = useState();
  const [remoteStream, setRemoteStream] = useState();
  const handleVideoClick = useCallback(
    (e) => {
      e.preventDefault();
      console.log("The video button is clicked and username=",username);
      socket.emit("room:join", { username, room });
    },
    [username, room, socket]
  );

  const handleJoinRoom = useCallback(
    (data) => {
      const { username, room } = data;
      setRoomPageOpened(true);
    },
    [setRoomPageOpened]
  );

  useEffect(() => {
    socket.on("room:join", handleJoinRoom);
    return () => {
      socket.off("room:join", handleJoinRoom);
    };
  }, [socket, handleJoinRoom]);

  const handleUserJoined = useCallback(({ username, id }) => {
    console.log(`Email ${username} joined room`);
    setRemoteSocketId(id);
  }, []);

  const handleCallUser = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });
    const offer = await peer.getOffer();
    socket.emit("user:call", { to: remoteSocketId, offer });
    setMyStream(stream);
  }, [remoteSocketId, socket]);

  const handleIncommingCall = useCallback(
    async ({ from, offer }) => {
      setRemoteSocketId(from);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      setMyStream(stream);
      console.log(`Incoming Call`, from, offer);
      const ans = await peer.getAnswer(offer);
      socket.emit("call:accepted", { to: from, ans });
    },
    [socket]
  );

  const sendStreams = useCallback(() => {
    for (const track of myStream.getTracks()) {
      peer.peer.addTrack(track, myStream);
    }
  }, [myStream]);

  const handleCallAccepted = useCallback(
    ({ from, ans }) => {
      peer.setLocalDescription(ans);
      console.log("Call Accepted!");
      sendStreams();
    },
    [sendStreams]
  );

  const handleNegoNeeded = useCallback(async () => {
    const offer = await peer.getOffer();
    socket.emit("peer:nego:needed", { offer, to: remoteSocketId });
  }, [remoteSocketId, socket]);

  useEffect(() => {
    peer.peer.addEventListener("negotiationneeded", handleNegoNeeded);
    return () => {
      peer.peer.removeEventListener("negotiationneeded", handleNegoNeeded);
    };
  }, [handleNegoNeeded]);

  const handleNegoNeedIncomming = useCallback(
    async ({ from, offer }) => {
      const ans = await peer.getAnswer(offer);
      socket.emit("peer:nego:done", { to: from, ans });
    },
    [socket]
  );

  const handleNegoNeedFinal = useCallback(async ({ ans }) => {
    await peer.setLocalDescription(ans);
  }, []);

  useEffect(() => {
    peer.peer.addEventListener("track", async (ev) => {
      const remoteStream = ev.streams;
      console.log("GOT TRACKS!!");
      setRemoteStream(remoteStream[0]);
    });
  }, []);

  useEffect(() => {
    socket.on("user:joined", handleUserJoined);
    socket.on("incomming:call", handleIncommingCall);
    socket.on("call:accepted", handleCallAccepted);
    socket.on("peer:nego:needed", handleNegoNeedIncomming);
    socket.on("peer:nego:final", handleNegoNeedFinal);

    return () => {
      socket.off("user:joined", handleUserJoined);
      socket.off("incomming:call", handleIncommingCall);
      socket.off("call:accepted", handleCallAccepted);
      socket.off("peer:nego:needed", handleNegoNeedIncomming);
      socket.off("peer:nego:final", handleNegoNeedFinal);
    };
  }, [
    socket,
    handleUserJoined,
    handleIncommingCall,
    handleCallAccepted,
    handleNegoNeedIncomming,
    handleNegoNeedFinal,
  ]);


  return (
    <div className="flex h-screen font-montserrat">
      {RoomPageOpened && (
        <div className="z-100">
          <h1>Room Page</h1>
          <h4>{remoteSocketId ? "Connected" : "No one in room"}</h4>
          {myStream && <button onClick={sendStreams}>Send Stream</button>}
          {remoteSocketId && (
            <button className="z-10" onClick={handleCallUser}>
              CALL
            </button>
          )}
          {myStream && (
            <div>
              <h1>My Stream</h1>
              <ReactPlayer
                playing
                muted
                height="100px"
                width="200px"
                url={myStream}
              />
            </div>
          )}
          {remoteStream && (
            <div>
              <h1>Remote Stream</h1>
              <ReactPlayer
                playing
                muted
                height="100px"
                width="200px"
                url={remoteStream}
              />
            </div>
          )}
        </div>
      )}
      <div className="bg-white w-1/3">
        <Logo />
        <div
          onClick={() => selectContact("653546af0562f26076aebdbd")}
          className={
            "border-b border-gray-100  flex item-center gap-2 cursor-pointer " +
            ("653546af0562f26076aebdbd" === selectedUserId ? "bg-blue-50" : "")
          }
        >
          {"653546af0562f26076aebdbd" === selectedUserId && (
            <div className="w-1 bg-blue-500 h-12 rounded-r-md"></div>
          )}
          <div className="flex gap-2 py-2 pl-4 items-center">
            <Avatar username="Global" userId="653546af0562f26076aebdbd" />
            <span className="text-gray-800">Global Group</span>
          </div>
        </div>
        {Object.keys(onlinePeopleExclOurUser).map((userId) => (
          <div
            key={userId}
            onClick={() => selectContact(userId)}
            className={
              "border-b border-gray-100  flex item-center gap-2 cursor-pointer " +
              (userId === selectedUserId ? "bg-blue-50" : "")
            }
          >
            {userId === selectedUserId && (
              <div className="w-1 bg-blue-500 h-12 rounded-r-md"></div>
            )}
            <div className="flex gap-2 py-2 pl-4 items-center">
              <Avatar username={onlinePeople[userId]} userId={userId} />
              <span className="text-gray-800">{onlinePeople[userId]}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-col bg-blue-50 w-2/3 p-2">
        <div className="flex-grow">
          {!selectedUserId && (
            <div className="flex h-full items-center justify-center">
              <div className="text=gray-300">
                &larr; Select a person from SideBar
              </div>
            </div>
          )}
          {!!selectedUserId && (
            <div className="z-1 relative h-full pb-4">
              <div className="text-center ">
                <BackGroundImage />
              </div>
              <div className="z-1 overflow-y-scroll absolute inset-0">
                {messagesWithoutDupes.map((message) => (
                  <div
                    key={message._id}
                    className={
                      message.sender === id ? " text-right" : " text-left"
                    }
                  >
                    <div
                      key={message._id}
                      className={
                        "inline-block p-2 my-2 rounded-md text-sm " +
                        (message.sender === id
                          ? " bg-blue-500 text-white "
                          : " bg-white text-gray-500")
                      }
                    >
                      {message.text}
                      {message.recipient === "653546af0562f26076aebdbd" && 
                      <div className="font-bold">
                        By {allPeople[message.sender]}
                      </div>
                      }
                    </div>
                  </div>
                ))}
                <div ref={divUnderMessages}></div>
              </div>
            </div>
          )}
        </div>
        {!!selectedUserId && (
          <form className="flex gap-2" onSubmit={sendMessage}>
            <input
              value={newMessageText}
              onChange={(ev) => setnewMessageText(ev.target.value)}
              type="text"
              placeholder="Type your messages here"
              className="bg-white flex-grow border rounded-sm p-2"
            />
            <button
              type="submit"
              className="bg-blue-500 p-2 text-white rounded-sm"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                />
              </svg>
            </button>
            <button
              onClick={handleVideoClick}
              className="bg-blue-500 p-2 text-white rounded-sm"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z"
                />
              </svg>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
