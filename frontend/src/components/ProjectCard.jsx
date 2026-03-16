import React from 'react'
import icon1 from '../assets/Project-Icons/1.png'
import iconUser1 from '../assets/icon-user-1.png'
import iconUser2 from '../assets/icon-user-2.png'
import iconUser3 from '../assets/icon-user-3.png'

const ProjectCard = () => {
  return (
    <div className='h-72 w-[30%] rounded-2xl bg-black/20 border-2 border-gray-900 flex flex-col
      transition-all duration-300 ease-in-out
      hover:scale-105
      hover:shadow-[0_0_18px_rgba(255,255,255,0.35)]
      active:scale-95
      active:shadow-[0_0_10px_rgba(255,255,255,0.6)]
      hover:brightness-110
      hover:cursor-pointer
    '>
      <div className='h-[70%] mb-2 flex flex-row p-4'>
        <img src={icon1} alt="Project-Icon" className='h-full'/>
        <div className='flex flex-col'>
          <h1 className='text-3xl ml-2' style={{fontFamily: "Orbitron"}}>Project Name</h1>
          <p className='mt-2 text-gray-400' style={{fontFamily: "Roboto Slab"}}> Lorem, ipsum dolor sit amet consectetur adipisicing elit. Cumque quidem deserunt consectetur! Dicta porro minima blanditiis alias dolorum earum atque. </p>
        </div>
      </div>
      <div className='flex flex-row'>
        <div className="w-10 h-10 border border-gray-500/50 rounded-full overflow-hidden flex items-center justify-center mr-1 ml-1">
          <img
            src={iconUser1}
            alt="UserIcon"
            className="w-full h-full object-cover scale-200"
          />
        </div>
        <div className="w-10 h-10 border border-gray-500/50 rounded-full overflow-hidden flex items-center justify-center mr-1 ml-1">
          <img
            src={iconUser3}
            alt="UserIcon"
            className="w-full h-full object-cover scale-140"
          />
        </div>
        <div className="w-10 h-10 border border-gray-500/50 rounded-full overflow-hidden flex items-center justify-center mr-1 ml-1">
          <img
            src={iconUser2}
            alt="UserIcon"
            className="w-full h-full object-cover scale-200"
          />
        </div>
        <p className='text-gray-600 ml-8 mt-2'>Active 1 mins ago</p>


        {/* <img src={iconUser1} alt="UserIcon" className='h-32 -ml-18 -mt-10'/>
        <img src={iconUser2} alt="UserIcon" className='h-32 -ml-40 -mt-10'/> */}
      </div>
    </div>
  )
}

export default ProjectCard