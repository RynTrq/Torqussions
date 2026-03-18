import React, {useContext} from 'react'
import { UserContext } from '../context/user.context'
import bg from '../assets/bg-projects.png'
import Header from '../components/Header'
import ProjectList from '../components/ProjectList'

const Home = () => {
    const {user} = useContext(UserContext)

  return (
    <div className="h-screen bg- bg-cover bg-center text-white flex flex-col" style={{backgroundImage: `url(${bg})`}}>
      <Header titleProp=""/>
      <ProjectList />
    </div>
  )
}

export default Home