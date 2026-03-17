import React, { useMemo } from 'react'

import icon1 from '../assets/Project-Icons/1.png'
import icon2 from '../assets/Project-Icons/2.png'
import icon3 from '../assets/Project-Icons/3.png'
import icon4 from '../assets/Project-Icons/4.png'
import icon5 from '../assets/Project-Icons/5.png'
import icon6 from '../assets/Project-Icons/6.png'
import icon7 from '../assets/Project-Icons/7.png'
import icon8 from '../assets/Project-Icons/8.png'
import icon9 from '../assets/Project-Icons/9.png'
import icon10 from '../assets/Project-Icons/10.png'
import icon11 from '../assets/Project-Icons/11.png'
import icon12 from '../assets/Project-Icons/12.png'
import icon13 from '../assets/Project-Icons/13.png'
import icon14 from '../assets/Project-Icons/14.png'
import icon15 from '../assets/Project-Icons/15.png'
import icon16 from '../assets/Project-Icons/16.png'

const icons = [
  icon1, icon2, icon3, icon4,
  icon5, icon6, icon7, icon8,
  icon9, icon10, icon11, icon12,
  icon13, icon14, icon15, icon16
]

const ProjectCard = ({ name, description }) => {
  const randomIcon = useMemo(() => {
    const index = Math.floor(Math.random() * icons.length)
    return icons[index]
  }, [])

  return (
    <div className='h-72 w-full max-w-[420px] rounded-2xl bg-black/20 border-2 border-gray-900 flex flex-col
      transition-all duration-300 ease-in-out
      hover:scale-105
      hover:shadow-[0_0_18px_rgba(255,255,255,0.35)]
      active:scale-95
      active:shadow-[0_0_10px_rgba(255,255,255,0.6)]
      hover:brightness-110
      hover:cursor-pointer
    '>
      <div className='h-[70%] mb-2 flex flex-row p-4'>
        <img src={randomIcon} alt="Project Icon" className='h-full'/>

        <div className='flex flex-col'>
          <h1 className='text-3xl ml-2' style={{fontFamily:"Orbitron"}}>
            {name}
          </h1>

          <p className='mt-2 text-gray-400' style={{fontFamily:"Roboto Slab"}}>
            {description}
          </p>
        </div>
      </div>

      <div className='flex justify-between items-center px-4 pb-4'>
        <span className='text-green-400 text-sm'>
          ● Active
        </span>
        <span className='text-gray-500 text-sm'>
          Updated recently
        </span>
      </div>
    </div>
  )
}

export default ProjectCard