import React, { useState, useEffect } from 'react'
import addUsersIcon from "../assets/icon-add-users.png"
import iconAllUsers from "../assets/icon-allUsers.png"
import iconSendMsg from "../assets/sendMsg.png"
import axios from "../config/axios.js";

const Chats = ({projectProp}) => {
    const [isModal, setIsModal] = useState(false);
    const [isModal2, setIsModal2] = useState(false);
    const [allUsers, setallUsers] = useState([]);
    const [search, setSearch] = useState("");
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [projectUsers, setProjectUsers] = useState([])

    useEffect(() => {
      axios.get('/users/all')
      .then((res) => {
          setallUsers(res.data.users);
      })
      .catch((err) => {
          console.log(err);
      });

      axios.get(`/projects/get-project/${projectProp._id}`)
      .then((res) => {
        console.log(res.data.project.users);
        setProjectUsers(res.data.project.users);
      }).catch((err) => {
        console.log(err);
      })
    }, []);

    useEffect(() => {
      let result = allUsers;

      if (projectUsers?.length) {
        result = result.filter(user =>
          !projectUsers.some(p => p._id === user._id)
        );
      }

      if (search.trim() !== "") {
        result = result.filter(user =>
          user.email?.toLowerCase().includes(search.toLowerCase()) ||
          user._id?.toLowerCase().includes(search.toLowerCase())
        );
      }

      setFilteredUsers(result);
    }, [search, allUsers, projectUsers]);

    async function addUsersHandler(e){
      e.preventDefault();
      try {
        const res = await axios.put('/projects/add-user', {
          projectId: projectProp._id,
          users: selectedUsers
        });

        setallUsers(prev =>
          prev.filter(user => !selectedUsers.includes(user._id))
        );

        const newUsers = allUsers.filter(user =>
          selectedUsers.includes(user._id)
        );

        setProjectUsers(prev => [...prev, ...newUsers]);

        setIsModal(false);
        setSelectedUsers([]);
      } catch (err) {
        console.log(err.response?.data || err.message);
      }
    }

  return (
    <div className='m-2 h-[95%] w-[33%] rounded-2xl bg-black/30 flex flex-col-reverse'>
      <div className='h-[10%] bg-black/60 rounded-2xl flex flex-row items-center'>
        <div className='h-[75%] w-[15%] rounded-2xl flex items-center justify-center ml-2'
        onClick={() => {
          if(!isModal && !isModal2){ setIsModal2(true); }
          if(!isModal && isModal2){ setIsModal2(false); }
          if(isModal && !isModal2){ setIsModal(false); setIsModal2(true) }
        }}>
          <img src={iconAllUsers} alt="Add Users" className='brightness-40 hover:brightness-65 hover:cursor-pointer
          transition-all duration-300 ease-in-out
          hover:scale-105
          active:scale-95'/>
        </div>

        <form className='h-full w-full ml-2 flex items-center'>
          <input type="text" className='h-[70%] w-[82%] p-2 border border-white/50 hover:border-white/80 focus:border-sky-300/80 rounded-2xl'/>
          <button type='submit' onClick={(e) => {e.preventDefault()}} className='h-[75%] w-[15%] rounded-2xl flex items-center justify-center ml-2'>
            <img src={iconSendMsg} alt="Send" className='brightness-40 hover:brightness-65 hover:cursor-pointer
            transition-all duration-300 ease-in-out
            hover:scale-105
            active:scale-95'/>
          </button>
        </form>
      </div>

      {/* ALL COLABORATORS MODAL STARTS HERE */}
      <div className='relative h-full w-full flex items-center justify-center'>
        <div className={`absolute inset-7 bg-black/1 backdrop-blur-md h-[90%] w-[90%] rounded-3xl 
        ${isModal2 ? "opacity-100" : "opacity-0 pointer-events-none"}
        transition-all duration-300 flex flex-col`}>
          
          <div className="bg-black/50 p-4 rounded-2xl flex justify-between items-center mb-4">
            <h2 className="text-blue-100 text-lg font-semibold" style={{fontFamily:"Orbitron"}}>All Collaborators</h2>
            
            <div className='w-[8%] rounded-2xl flex items-center justify-center'
            onClick={() => {setIsModal2(false); setIsModal(true)}}>
              <img src={addUsersIcon} alt="Add Users" className='brightness-40 hover:brightness-65 hover:cursor-pointer
              transition-all duration-300 ease-in-out
              hover:scale-105
              active:scale-95'/>
            </div>

            <button
              onClick={() => setIsModal2(false)}
              className="bg-orange-200/30 hover:bg-orange-200/50 rounded-full pr-2 pl-2 pt-0.5 pb-0.5 text-blue-100 text-xl hover:scale-110 transition hover:cursor-pointer"
            >
              ✕
            </button>
          </div>

          <div className="mr-2 ml-3 flex-1 overflow-y-auto flex flex-col gap-2 pr-1">
            {projectUsers.length === 0 ? (
              <p className="text-gray-400 text-center">No collaborators yet</p>
            ) : (
              projectUsers.map(({ email, _id }) => (
                <div key={_id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5">

                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-blue-100">
                    {email?.[0]?.toUpperCase()}
                  </div>

                  <div className="flex flex-col">
                    <span className="text-white text-sm">{email}</span>
                    <span className="text-gray-400 text-xs">{_id}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      {/* ALL COLABORATORS MODAL STARTS HERE */}
        
        
        {/* ADD COLABORATORS MODAL STARTS HERE */}
        <form onSubmit={addUsersHandler} className={`absolute inset-7 bg-black/1 backdrop-blur-md h-[90%] w-[90%] rounded-3xl 
          ${isModal ? "opacity-100" : "opacity-0 pointer-events-none"}
          transition-all duration-300 flex flex-col`}>

          <div className="bg-black/50 p-4 rounded-2xl flex justify-between items-center mb-4">
            <h2 className="text-blue-100 text-lg font-semibold" style={{fontFamily:"Orbitron"}}>Add Collaborators</h2>
            <button
              onClick={() => {setIsModal(false); setIsModal2(true)}}
              className="bg-orange-200/30 hover:bg-orange-200/50 rounded-full pr-2 pl-2 pt-0.5 pb-0.5 text-blue-100 text-xl hover:scale-110 transition hover:cursor-pointer"
            >
              ✕
            </button>
          </div>

          <input
            type="text"
            placeholder="Search users . . ."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-4 ml-4 mr-4 p-2 rounded-lg bg-white/10 text-blue-100 outline-none border border-white/20"
            style={{fontFamily:"Orbitron"}}
          />

          <div className="mr-2 ml-3 flex-1 overflow-y-auto flex flex-col gap-2 pr-1">
            {filteredUsers.map(({ email, _id }) => (
              <div
                key={_id}
                className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/20 transition cursor-pointer"
              >
                <input type="checkbox"
                className="accent-cyan-500"
                onChange={() => {
                  setSelectedUsers(prev => 
                    prev.includes(_id)
                      ? prev.filter(id => id !== _id)
                      : [...prev, _id]
                  );
                }}
                />

                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-xs text-blue-100" style={{fontFamily:"Orbitron"}}>
                  {email?.[0]?.toUpperCase()}
                </div>

                <div className="flex flex-col">
                  <span className="text-white text-sm">{email}</span>
                  <span className="text-gray-400 text-xs">{_id}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 m-4">
            <button onClick={() => {setIsModal(false); setIsModal2(true)}} type='submit' className="px-4 py-2 rounded-lg bg-orange-200/30 text-blue-100 hover:bg-orange-200/50 transition hover:cursor-pointer"
              style={{fontFamily:"Orbitron"}}>
              Add Users
            </button>
          </div>
        </form>
        {/* ADD COLABORATORS MODAL ENDS HERE */}
      </div>
    </div>
  )
}

export default Chats