import React, { useContext, useEffect, useState } from 'react';
import { UserContext } from '../context/user.context.jsx';
import { useNavigate } from 'react-router-dom';
import axios from '../config/axios.js';
import ProjectCard from './ProjectCard.jsx';

const PROJECTS_PER_PAGE = 6;

const ProjectList = () => {
    const { user } = useContext(UserContext);
    const navigate = useNavigate();

    const [isModal, setIsModal] = useState(false);
    const [projectName, setProjectName] = useState("");
    const [projectDesc, setProjectDesc] = useState("");

    const [projects, setProjects] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        axios.get('/projects/all')
        .then((res)=>{
            setProjects(res.data.projects)
        })
        .catch((err)=>{
            console.log(err)
        })
    }, [])

    async function createProject(e){
        e.preventDefault()
        try{
            const res = await axios.post('/projects/create',{
                name: projectName,
                description: projectDesc
            })
            const newProject = res.data
            setProjects(prev => [newProject, ...prev])
            setCurrentPage(1)
            setProjectName("")
            setProjectDesc("")
            setIsModal(false)
        }catch(err){
            console.log(err.response?.data)
        }
    }

    const totalPages = Math.ceil(projects.length / PROJECTS_PER_PAGE)
    const startIndex = (currentPage - 1) * PROJECTS_PER_PAGE
    const endIndex = startIndex + PROJECTS_PER_PAGE
    const visibleProjects = projects.slice(startIndex, endIndex)

    const pages = []
    for(let i=1;i<=totalPages;i++){
        pages.push(i)
    }

    return (
    <div className='h-screen flex justify-center overflow-hidden'>
        <div className='w-11/12 lg:w-5/6 flex flex-col h-full'>
            <div className='flex justify-center mt-6'>
                <button
                onClick={()=>setIsModal(true)}
                className='w-2/3 md:w-1/2 pt-3 pb-3 rounded-xl bg-linear-to-r from-white/50 via-blue-400/30 to-black/60 text-xl
                transition-all duration-300 ease-in-out
                hover:scale-105 active:scale-95 hover:brightness-150 hover:cursor-pointer'
                style={{fontFamily:"Orbitron"}}
                >
                    + Create New Project
                </button>
            </div>

            <div className={`fixed inset-0 flex items-center justify-center transition-all duration-300
            ${isModal ? "opacity-100":"opacity-0 pointer-events-none"}`}>
                <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={()=>setIsModal(false)}
                />

                <div className={`relative z-10 w-96 md:w-[420px] p-8 rounded-2xl
                bg-linear-to-br from-white/10 via-blue-500/10 to-black/30 backdrop-blur-xl
                border border-white/20 shadow-2xl
                transform transition-all duration-300
                ${isModal ? "scale-100":"scale-95"}`}>
                    <h2 className="text-white text-xl mb-6 text-center" style={{fontFamily:"Inter"}}>
                        Create New Project
                    </h2>
                    <form onSubmit={createProject}>
                        <input
                        type="text"
                        placeholder="Enter project name..."
                        value={projectName}
                        onChange={(e)=>setProjectName(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20
                        text-white placeholder-white/50 outline-none focus:border-blue-400 transition"
                        />

                        <input
                        type="text"
                        placeholder="Enter project description..."
                        value={projectDesc}
                        onChange={(e)=>setProjectDesc(e.target.value)}
                        className="w-full mt-3 px-4 py-3 rounded-lg bg-white/10 border border-white/20
                        text-white placeholder-white/50 outline-none focus:border-blue-400 transition"
                        />

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                            type="button"
                            onClick={()=>setIsModal(false)}
                            className="px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition"
                            >
                                Cancel
                            </button>

                            <button
                            type="submit"
                            className="px-4 py-2 rounded-lg text-white bg-linear-to-r from-blue-300 to-blue-700
                            hover:brightness-140 transition"
                            >
                                Create
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            <h1
            className="text-4xl md:text-5xl tracking-wide mt-10 mb-8 text-center"
            style={{fontFamily:"Orbitron"}}
            >
                Your Projects
            </h1>

            <div className="flex-1 flex flex-col justify-between">

                <div className='
                grid
                grid-cols-1
                sm:grid-cols-2
                lg:grid-cols-3
                gap-8
                place-items-center
                content-start
                '>
                    {visibleProjects.map(project => (
                        <ProjectCard
                        key={project._id}
                        name={project.name}
                        description={project.description}
                        />
                    ))}
                </div>

                <div className='flex justify-center mt-6 mb-6 gap-3 flex-wrap'>
                    {pages.map(page => (
                        <button
                        key={page}
                        onClick={()=>setCurrentPage(page)}
                        className={`
                        px-4 py-2 rounded-lg border border-white/20
                        ${page === currentPage
                            ? "bg-cyan-400 text-white"
                            : "bg-white/10 text-gray-300 hover:bg-white/20"}
                        `}
                        >
                            {page}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    </div>
    )
}

export default ProjectList