import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import bg from "../assets/bg-chatScreen.png"
import Header from '../components/Header'
import Chats from '../components/Chats.jsx'

const Project = () => {
    const location = useLocation();
    const {projectProp} = location.state;

  return (
    <div className='h-screen bg-cover bg-center text-white' style={{backgroundImage:`url(${bg})`}}>
      <Header titleProp={projectProp.name}/>
      <div className='h-[88.5%] flex flex-row'>
        <Chats projectProp={projectProp}/>
      </div>
    </div>
  )
}

export default Project
