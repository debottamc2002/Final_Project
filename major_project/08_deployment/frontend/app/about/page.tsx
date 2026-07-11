export default function AboutPage() {
  return (
    <main>
      <section className="hero glass single-hero">
        <div>
          <p className="eyebrow">Project Team</p>
          <h1>About Us</h1>
          <p className="hero-text">
            We are postgraduate Data Science and Analytics students building an
            applied macroeconomic intelligence system for forecasting,
            surveillance, and decision support.
          </p>
        </div>
      </section>

      <section className="team-grid">
        <div className="profile-card glass hover-lift">
          <div className="avatar">DC</div>
          <h2>Debottam Chakraborty</h2>
          <p className="role">M.Sc. Data Science and Analytics</p>
          <p>
            Aspiring Business Analyst passionate about solving real-world
            problems using data, analytical thinking, and decision-oriented
            insights.
          </p>
          <div className="contact-box">
            <p><strong>Phone:</strong> 6296453187</p>
            <p><strong>Email:</strong> debottamchakraborty2234@gmail.com</p>
          </div>
        </div>

        <div className="profile-card glass hover-lift">
          <div className="avatar">AM</div>
          <h2>Ananya Manna</h2>
          <p className="role">M.Sc. Data Science and Analytics</p>
          <p>
            Aspiring Machine Learning Engineer focused on data-driven decision
            making and the development of accurate, scalable, and interpretable
            predictive models.
          </p>
          <div className="contact-box">
            <p><strong>Phone:</strong> 8777527203</p>
            <p><strong>Email:</strong> ananyamanna738@gmail.com</p>
          </div>
        </div>
      </section>

      <section className="panel glass">
        <h2>Project Vision</h2>
        <p className="muted big-text">
          This project presents a hybrid macroeconomic surveillance framework
          that integrates econometric modelling, machine learning forecasting,
          LSTM-based sequential learning, and an early warning classifier. The
          goal is not only to forecast GDP growth, but also to identify
          countries that may face macroeconomic instability in upcoming
          projection years.
        </p>
      </section>

      <section className="skills-grid">
        <div className="skill-card glass hover-lift">Econometric Modelling</div>
        <div className="skill-card glass hover-lift">Machine Learning</div>
        <div className="skill-card glass hover-lift">Early Warning System</div>
        <div className="skill-card glass hover-lift">FastAPI Backend</div>
        <div className="skill-card glass hover-lift">Docker Deployment</div>
        <div className="skill-card glass hover-lift">Interactive Frontend</div>
      </section>
    </main>
  );
}
