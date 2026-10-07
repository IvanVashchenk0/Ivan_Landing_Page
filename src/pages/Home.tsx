import { Link } from 'react-router'
import { Navigation } from '../components/navigation/Navigation'
import { ProjectSection } from '../components/project/ProjectSection'
import { MaterialStrip } from '../components/editorial/MaterialStrip'
import { featuredProjects } from '../data/projects/index'

export function Home() {
  return <>
    <section className="hero hero-materials" aria-labelledby="hero-title">
      <div className="hero-center">
        <h1 id="hero-title"><Link to="/ivan" aria-label="Ivan Vashchenko"><span>IVAN</span><span>VASHCHENKO<span className="name-dot">.</span></span></Link></h1>
        <Navigation hero />
      </div>
      <MaterialStrip />
    </section>
    {featuredProjects.map((project, index) => <ProjectSection key={project.id} project={project} index={index} minimal />)}
  </>
}
