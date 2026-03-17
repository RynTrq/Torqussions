import React, { useState, useContext } from 'react'
import bg from "../assets/Auth-screen.png";
import AuthImg from "../assets/Auth-screen-img.png";
import bgButton from "../assets/Auth-button.jpg"
import { Link, useNavigate } from 'react-router-dom'
import axios from '../config/axios';
import { UserContext } from '../context/user.context';

const Signup = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const { setUser } = useContext(UserContext);

  const navigate = useNavigate();

  function submitHandler(e) {
    e.preventDefault();

    axios.post('/users/register', {
      email,
      password
    }).then((res) => {
      console.log(res.data);

      localStorage.setItem('token', res.data.token)
      setUser(res.data.user)

      navigate('/')
    }).catch((err) => {
      console.log(err.response.data);
    })
  }

  return (
    <div className="h-screen bg-cover bg-center flex items-center justify-center text-white" style={{ backgroundImage: `url(${bg})` }}>
      <div className="h-3/4 w-2/3 bg-black/50 flex rounded-xl hover:shadow-[0_0_20px_rgba(255,255,255,0.3)]">

        <div className="bg-cover bg-center w-1/2" style={{ backgroundImage: `url(${AuthImg})` }} />

        <div className="w-1/2 flex flex-col items-center justify-center ">
          <div className="w-2/3 flex flex-col items-center">

            <h1 className="text-5xl font-semibold mb-16" style={{ fontFamily: "Inter" }}>
              Sign up
            </h1>

            <form onSubmit={submitHandler} className="w-full flex flex-col items-center gap-4">

              <input
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border-b border-gray-400 py-2 outline-none
                transition-all duration-300 ease-in-out
                hover:scale-105
                hover:shadow-[0_0_18px_rgba(255,255,255,0.35)]
                active:scale-95
                active:shadow-[0_0_10px_rgba(255,255,255,0.6)]
                hover:brightness-110"
                type="text"
                placeholder="Email"
              />

              <input
              onChange={(e) => setPassword(e.target.value)}
                className="w-full border-b border-gray-400 py-2 outline-none
                transition-all duration-300 ease-in-out
                hover:scale-105
                hover:shadow-[0_0_18px_rgba(255,255,255,0.35)]
                active:scale-95
                active:shadow-[0_0_10px_rgba(255,255,255,0.6)]
                hover:brightness-110"
                type="password"
                placeholder="Password"
              />

              <button className="bg-cover bg-center w-7/8 mt-4 py-3 rounded-lg text-gray-400 text-xl font-semibold tracking-wide
                transition-all duration-300 ease-in-out
                hover:scale-105
                hover:shadow-[0_0_18px_rgba(255,255,255,0.35)]
                active:scale-95
                active:shadow-[0_0_10px_rgba(255,255,255,0.6)]
                hover:brightness-110
                cursor-pointer"
                style={{ backgroundImage: `url(${bgButton})` }}
              >
                Signup
              </button>

            </form>
          </div>

          <div className='text-gray-400 mt-12 flex flex-row gap-2'>
            Already have an account?
            <Link to="/login" className='hover:text-white hover:cursor-pointer'>Sign in</Link>
          </div>
        </div>

      </div>
    </div>
  )
}

export default Signup