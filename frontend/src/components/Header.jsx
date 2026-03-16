import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import iconProjects from '../assets/icon.png';
import iconUser1 from '../assets/icon-user-1.png';
import axios from '../config/axios';

const Header = () => {
  const [isModal, setIsModal] = useState(false);
  const navigate = useNavigate();

  return (
    <div className='h-1/9 flex items-center justify-between'>
        <Link href = "/" className='flex flex-row'>
            <img src={iconProjects} alt="Projects Icon" className="h-52 object-contain
                transition-all duration-300 ease-in-out
                hover:scale-105
                active:scale-95
                hover:brightness-200"
            />
        </Link>

        <img
        src={iconUser1}
        alt="User Icon"
        className="h-52 mt-2 mr-2
                transition-all duration-300 ease-in-out
                hover:scale-105
                active:scale-95
                hover:brightness-110
                hover:cursor-pointer"
        onClick={() => isModal?setIsModal(false):setIsModal(true)}
        />

        <div
          className={`absolute right-4 top-28 w-56 bg-black rounded-xl shadow-xl border border-gray-200 py-2 z-50
          transform transition-all duration-200 ease-out
          ${isModal ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none"}
          `}
        >
          <ul className="flex flex-col text-sm">
            <li className="px-4 py-2 hover:bg-gray-100 hover:text-black cursor-pointer">
              Profile
            </li>

            <li className="px-4 py-2 hover:bg-gray-100 hover:text-black cursor-pointer">
              Settings
            </li>

            <li className="px-4 py-2 hover:bg-gray-100 hover:text-black cursor-pointer"
              onClick={() => {
                navigate("/");
                setIsModal(false);
              }}
            >
              My Projects
            </li>

            <div className="border-t my-2"></div>

            <li className="px-4 py-2 text-red-500 hover:bg-red-50 cursor-pointer"
              onClick={() => {
                axios.get('/users/logout')
                  .then((res) => {
                    console.log(res.data);
                    localStorage.removeItem("token");
                    navigate('/login');
                  })
                  .catch((err) => {
                    console.log(err.response?.data);
                  });
              }}
            >
              Logout
            </li>
          </ul>
        </div>
    </div>
  )
}

export default Header
