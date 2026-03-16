import React, { useState } from 'react';
import axios from '../config/axios.js';
import ProjectCard from './ProjectCard.jsx';

const ProjectList = () => {
    const [isModal, setIsModal] = useState(false);
    const [projectName, setProjectName] = useState("")
    const [projectDesc, setProjectDesc] = useState("")

    function createProject(e){
        e.preventDefault()
        console.log({projectName});
        console.log({projectDesc});
        
        axios.post('/projects/create', {
            name: projectName,
            description: projectDesc
        }).then((res) =>{
            console.log(res);
            setIsModal(false)
            setProjectDesc("")
            setProjectName("")
        }).catch((err)=>{
            console.log(err.response.data);            
        })
    }
  
    return (
    <div className='h-8/9 flex justify-center'>
      <div className='h-7/8 w-5/6 flex flex-col'>
        <div className='flex justify-center'>
            <button onClick={() => {setIsModal(true)}} className='w-1/2 pt-3 pb-3 rounded-xl bg-linear-to-r from-white/50 via-blue-400/30 to-black/60 text-xl
                transition-all duration-300 ease-in-out
                hover:scale-105
                active:scale-95
                hover:brightness-150
                hover:cursor-pointer'

                style={{ fontFamily: "Orbitron" }}
            >+ Create New Project</button>
        </div>
        
        <div className={`fixed inset-0 flex items-center justify-center transition-all duration-300
                ${isModal?"opacity-100" : "opacity-0 pointer-events-none"}
            `}>
                <div
                    className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                    onClick={() => setIsModal(false)}
                />

                <div
                    className={`relative z-10 w-105 p-8 rounded-2xl
                    bg-linear-to-br from-white/10 via-blue-500/10 to-black/30 backdrop-blur-xl
                    border border-white/20 shadow-2xl
                    transform transition-all duration-300
                    ${isModal ? "scale-100" : "scale-95"}
                `}>
                    <h2 className="text-white text-xl mb-6 text-center" style={{ fontFamily: "Inter" }}>
                        Create New Project
                    </h2>
                    
                    <form onSubmit={createProject}>
                        <input
                            type="text" placeholder="Enter project name..."
                            value={projectName} onChange={(e) => setProjectName(e.target.value)}
                            className="w-full px-4 py-3 rounded-lg bg-white/10
                            border border-white/20
                            text-white placeholder-white/50 outline-none
                            focus:border-blue-400
                            hover:shadow-[0_0_18px_rgba(255,255,255,0.35)]
                            transition"
                            style={{ fontFamily: "Inter" }}
                            />

                        <input
                            type="text" placeholder="Enter project description..."
                            value={projectDesc} onChange={(e) => setProjectDesc(e.target.value)}
                            className="w-full mt-2 px-4 py-3 rounded-lg bg-white/10
                            border border-white/20
                            text-white placeholder-white/50 outline-none
                            focus:border-blue-400
                            hover:shadow-[0_0_18px_rgba(255,255,255,0.35)]
                            transition"
                            style={{ fontFamily: "Inter" }}
                            />

                        <div className="flex justify-end gap-3 mt-6">
                            <button onClick={() => setIsModal(false)} className="px-4 py-2 rounded-lg
                            bg-white/10 text-white hover:bg-white/20 hover:cursor-pointer transition"
                            style={{ fontFamily: "Inter" }}>
                            Cancel
                            </button>
                            <button type='submit' className="px-4 py-2 rounded-lg text-white
                            bg-linear-to-r from-blue-300 to-blue-700
                            hover:brightness-140 hover:cursor-pointer transition"
                            style={{ fontFamily: "Inter" }}>
                            Create
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            <h1 className="text-5xl tracking-wide hover:brightness-1500 mt-8 mb-7" style={{ fontFamily: "Orbitron" }}>Your Projects</h1>
            <div className='h-full flex flex-col justify-between'>
                <ProjectCard />
                <ProjectCard />
            </div>
        </div>
    </div>
  )
}

export default ProjectList
