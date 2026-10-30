import { useEffect, useState } from "react";
import "./Home.css";

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [localities, setLocalities] = useState([]);
  const [stateId, setStateId] = useState("");
  const [cityId, setCityId] = useState("");
  const [localityId, setLocalityId] = useState("");
  const [locationMessage, setLocationMessage] = useState("");

  useEffect(() => {
    fetch("/api/locations/states")
      .then((response) => {
        if (!response.ok) throw new Error();
        return response.json();
      })
      .then(setStates)
      .catch(() =>
        setLocationMessage("Could not load states. Check the backend connection.")
      );
  }, []);

  async function handleStateChange(event) {
    const id = event.target.value;

    setStateId(id);
    setCityId("");
    setLocalityId("");
    setCities([]);
    setLocalities([]);
    setLocationMessage("");

    if (!id) return;

    try {
      const response = await fetch(`/api/locations/states/${id}/cities`);
      if (!response.ok) throw new Error();
      setCities(await response.json());
    } catch {
      setLocationMessage("Could not load cities. Please try again.");
    }
  }

  async function handleCityChange(event) {
    const id = event.target.value;

    setCityId(id);
    setLocalityId("");
    setLocalities([]);
    setLocationMessage("");

    if (!id) return;

    try {
      const response = await fetch(
        `/api/locations/cities/${id}/localities`
      );

      if (!response.ok) throw new Error();

      const data = await response.json();
      setLocalities(data);

      if (data.length === 0) {
        setLocationMessage("No active localities found.");
      }
    } catch {
      setLocationMessage("Could not load localities. Please try again.");
    }
  }

  return (
    <>
      <header className="navbar">
        <a href="#home" className="logo" aria-label="CivicPulse home">
          <span className="logo-icon">C</span>
          <span>
            Civic<span className="logo-accent">Pulse</span>
          </span>
        </a>

        <button
          className={`menu-toggle ${menuOpen ? "menu-active" : ""}`}
          type="button"
          aria-label={menuOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={menuOpen}
          aria-controls="mainNav"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        <nav
          className={`nav-links ${menuOpen ? "nav-open" : ""}`}
          id="mainNav"
          aria-label="Main navigation"
        >
          <a href="#home" className="nav-link" onClick={() => setMenuOpen(false)}>
            Home
          </a>
          <a href="#about" className="nav-link" onClick={() => setMenuOpen(false)}>
            About Us
          </a>
          <a
            href="#how-it-works"
            className="nav-link"
            onClick={() => setMenuOpen(false)}
          >
            How It Works
          </a>
          <a
            href="#features"
            className="nav-link"
            onClick={() => setMenuOpen(false)}
          >
            Features
          </a>
          <a
            href="#contact"
            className="nav-link"
            onClick={() => setMenuOpen(false)}
          >
            Contact Us
          </a>
          <a
            href="/login"
            className="nav-link login-link"
            onClick={() => setMenuOpen(false)}
          >
            Login
          </a>
          <a
            href="/register"
            className="nav-cta"
            onClick={() => setMenuOpen(false)}
          >
            Get Started <span>↗</span>
          </a>
        </nav>
      </header>

      <main>
        <section className="hero" id="home">
          <div className="hero-content">
            <div className="eyebrow">
              <span className="status-dot"></span>
              YOUR COMMUNITY, YOUR VOICE
            </div>

            <h1>
              Better communities
              <br />
              begin with <span>you.</span>
            </h1>

            <p className="hero-description">
              Report potholes, overflowing garbage, broken streetlights
              and other civic issues. Help your local authorities
              understand problems and work towards solutions.
            </p>

            <div className="hero-actions">
              <a href="/login" className="primary-button">
                Report an Issue <span>→</span>
              </a>
              <a href="#how-it-works" className="secondary-button">
                Discover How It Works
              </a>
            </div>

            <div className="hero-note">
              <span className="note-icon">✓</span>
              Your voice can help make your neighbourhood better.
            </div>
          </div>

          <div className="hero-decoration" aria-hidden="true">
            <div className="decoration-ring ring-one"></div>
            <div className="decoration-ring ring-two"></div>
            <div className="decoration-circle">CP</div>

            <div className="floating-card">
              <span className="floating-icon">⌖</span>
              <div>
                <strong>Local action</strong>
                <p>Community powered</p>
              </div>
            </div>

            <div className="floating-card floating-card-bottom">
              <span className="floating-icon">✓</span>
              <div>
                <strong>Stay informed</strong>
                <p>Track your reports</p>
              </div>
            </div>
          </div>
        </section>

        <section className="intro-section" id="how-it-works">
          <div className="intro-item">
            <span className="intro-number">01</span>
            <div>
              <h3>Report an issue</h3>
              <p>Describe the problem and upload a photo.</p>
            </div>
          </div>

          <div className="intro-divider"></div>

          <div className="intro-item">
            <span className="intro-number">02</span>
            <div>
              <h3>Reach the right area</h3>
              <p>Choose the locality where the issue occurred.</p>
            </div>
          </div>

          <div className="intro-divider"></div>

          <div className="intro-item">
            <span className="intro-number">03</span>
            <div>
              <h3>Track progress</h3>
              <p>Follow updates as authorities review the issue.</p>
            </div>
          </div>
        </section>

        <section className="content-section about-section" id="about">
          <div className="about-content">
            <span className="section-label">ABOUT CIVICPULSE</span>

            <h2>
              A stronger connection between citizens and
              <span className="heading-period"> local authorities.</span>
            </h2>

            <p>
              CivicPulse is a community issue reporting platform
              designed to make it easier for citizens to report
              local problems and follow their progress.
            </p>

            <p>
              By connecting reports with the relevant locality,
              the platform helps authorized administrators review
              community concerns and manage their resolution.
            </p>

            <a href="/register" className="text-link">
              Become a CivicPulse user <span>→</span>
            </a>
          </div>

          <div className="about-highlight">
            <div className="highlight-icon">⌖</div>
            <h3>Local problems deserve local attention.</h3>
            <p>
              Location-based reporting helps route issues to the
              administrator responsible for the selected area.
            </p>
          </div>
        </section>

        <section className="content-section issues-section" id="features">
          <div className="section-heading">
            <div>
              <span className="section-label">WHAT YOU CAN REPORT</span>
              <h2>
                Every issue matters
                <span className="heading-period">.</span>
              </h2>
              <p>
                Help bring attention to everyday problems that
                affect the safety, cleanliness and quality of life
                in your neighbourhood.
              </p>
            </div>
          </div>

          <div className="feature-grid">
            <article className="feature-card">
              <div className="feature-icon icon-blue">⌁</div>
              <h3>Roads and potholes</h3>
              <p>Report damaged roads, potholes and unsafe road conditions.</p>
            </article>

            <article className="feature-card">
              <div className="feature-icon icon-green">♻</div>
              <h3>Garbage and waste</h3>
              <p>Bring attention to overflowing bins, litter and illegal dumping.</p>
            </article>

            <article className="feature-card">
              <div className="feature-icon icon-orange">☼</div>
              <h3>Streetlights</h3>
              <p>Report broken lights and poorly illuminated public spaces.</p>
            </article>

            <article className="feature-card">
              <div className="feature-icon icon-purple">≈</div>
              <h3>Water supply</h3>
              <p>Report water supply interruptions and related local concerns.</p>
            </article>

            <article className="feature-card">
              <div className="feature-icon icon-teal">⌁</div>
              <h3>Drainage problems</h3>
              <p>Report blocked drains, waterlogging and drainage concerns.</p>
            </article>

            <article className="feature-card">
              <div className="feature-icon icon-red">＋</div>
              <h3>Other civic issues</h3>
              <p>Bring other public infrastructure and neighbourhood problems to attention.</p>
            </article>
          </div>
        </section>

        <section className="content-section platform-section">
          <div className="section-heading centered-heading">
            <span className="section-label">BUILT FOR COMMUNITIES</span>
            <h2>Simple reporting. Clearer progress.</h2>
            <p>
              CivicPulse brings reporting and issue management
              together in one platform.
            </p>
          </div>

          <div className="platform-grid">
            <article className="platform-card">
              <span className="platform-number">01</span>
              <h3>Photo-based reports</h3>
              <p>Add photos and descriptions to help explain the problem you encounter.</p>
            </article>

            <article className="platform-card">
              <span className="platform-number">02</span>
              <h3>Locality-based routing</h3>
              <p>Associate each report with a location so the appropriate area administrator can review it.</p>
            </article>

            <article className="platform-card">
              <span className="platform-number">03</span>
              <h3>Status tracking</h3>
              <p>Follow complaint statuses and review available progress updates from your dashboard.</p>
            </article>

            <article className="platform-card">
              <span className="platform-number">04</span>
              <h3>Role-based dashboards</h3>
              <p>Citizens, area administrators and super administrators have separate interfaces.</p>
            </article>
          </div>
        </section>

        <section className="content-section process-section">
          <div className="section-heading">
            <div>
              <span className="section-label">THE PROCESS</span>
              <h2>From report to resolution.</h2>
              <p>
                A clear workflow helps citizens and administrators
                understand the progress of a reported issue.
              </p>
            </div>
          </div>

          <div className="process-list">
            <div className="process-step">
              <span className="process-number">1</span>
              <div>
                <h3>Sign in to CivicPulse</h3>
                <p>Create an account or sign in to access your citizen dashboard.</p>
              </div>
            </div>

            <div className="process-step">
              <span className="process-number">2</span>
              <div>
                <h3>Submit a detailed report</h3>
                <p>Select the issue category and locality, describe the problem and attach a photo.</p>
              </div>
            </div>

            <div className="process-step">
              <span className="process-number">3</span>
              <div>
                <h3>Authorities review the issue</h3>
                <p>The relevant area administrator can review reports assigned to their locality.</p>
              </div>
            </div>

            <div className="process-step">
              <span className="process-number">4</span>
              <div>
                <h3>Follow status updates</h3>
                <p>Return to your dashboard to check the latest available status of your report.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="content-section location-section" id="locations">
          <div className="section-heading">
            <div>
              <span className="section-label">YOUR NEIGHBOURHOOD</span>
              <h2>
                Start with your location
                <span className="heading-period">.</span>
              </h2>
              <p>
                Explore the locations available in CivicPulse.
                Sign in to report an issue for your locality.
              </p>
            </div>

            <div className="location-badge">
              <span>⌖</span> Location selection
            </div>
          </div>

          <div className="location-card">
            <div className="location-card-heading">
              <div className="location-heading-icon">⌖</div>
              <div>
                <h3>Where did the issue occur?</h3>
                <p>Choose a state, city and locality.</p>
              </div>
            </div>

            <div className="location-form">
              <div className="form-group">
                <label htmlFor="state">State <span>*</span></label>
                <select
                  id="state"
                  name="state"
                  value={stateId}
                  onChange={handleStateChange}
                  required
                >
                  <option value="">Select a state</option>
                  {states.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="city">City <span>*</span></label>
                <select
                  id="city"
                  name="city"
                  value={cityId}
                  onChange={handleCityChange}
                  required
                  disabled={!stateId}
                >
                  <option value="">Select a city</option>
                  {cities.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="locality">Locality <span>*</span></label>
                <select
                  id="locality"
                  name="locality"
                  value={localityId}
                  onChange={(event) => setLocalityId(event.target.value)}
                  required
                  disabled={!cityId}
                >
                  <option value="">Select a locality</option>
                  {localities.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>

              <p
                id="location-message"
                className="location-message"
                role="status"
                aria-live="polite"
              >
                {locationMessage}
              </p>
            </div>

            <div className="location-card-footer">
              <span className="secure-icon">✓</span>
              Choose the correct location to help associate a report
              with the appropriate area.
            </div>
          </div>
        </section>

        <section className="report-section" id="report">
          <div className="report-content">
            <span className="section-label light-label">YOUR VOICE MATTERS</span>

            <h2>
              A better neighbourhood
              <br />
              starts with one action.
            </h2>

            <p>
              See a pothole, overflowing garbage or a broken streetlight?
              Sign in to CivicPulse and report the issue through your
              citizen dashboard.
            </p>

            <div className="hero-actions">
              <a href="/login" className="report-button">
                Sign In to Report <span>→</span>
              </a>
              <a href="/register" className="report-secondary-button">
                Create Account
              </a>
            </div>
          </div>

          <div className="report-visual" aria-hidden="true">
            <div className="report-visual-circle">
              <div className="report-visual-inner">
                <span className="report-check">✓</span>
                <span>YOUR VOICE</span>
                <strong>MATTERS</strong>
              </div>
            </div>
            <div className="report-spark spark-one">✳</div>
            <div className="report-spark spark-two">✦</div>
          </div>
        </section>

        <section className="content-section contact-section" id="contact">
          <div>
            <span className="section-label">CONTACT US</span>
            <h2>Let's build better communities.</h2>
            <p>
              Have questions or feedback about CivicPulse?
              Sign in to your account or contact your platform
              administrator for assistance.
            </p>
          </div>

          <div className="contact-actions">
            <a href="/login" className="primary-button">
              Sign In <span>→</span>
            </a>
            <a href="/register" className="secondary-button">
              Get Started
            </a>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="footer-main">
          <div>
            <a href="#home" className="logo footer-logo">
              <span className="logo-icon">C</span>
              <span>
                Civic<span className="logo-accent">Pulse</span>
              </span>
            </a>

            <p>
              Small actions. Better neighbourhoods.
              Stronger communities.
            </p>
          </div>

          <div className="footer-links">
            <a href="#about">About</a>
            <a href="#how-it-works">How It Works</a>
            <a href="#features">Features</a>
            <a href="#contact">Contact</a>
            <a href="/login">Login</a>
          </div>

          <a href="#home" className="back-to-top">
            Back to top ↑
          </a>
        </div>

        <div className="footer-bottom">
          <span>© 2026 CivicPulse</span>
          <span>Built for better communities.</span>
        </div>
      </footer>
    </>
  );
}