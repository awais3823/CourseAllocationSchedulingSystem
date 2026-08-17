import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen, ClipboardList, Calendar, Users,
  GraduationCap, FileText, School, BarChart2,
  ArrowRight, CheckCircle, ChevronDown
} from 'lucide-react';
import ScheduliXLogo from '../components/ScheduliXLogo';
import './LandingPage.css';

const LandingPage = () => {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const features = [
    {
      icon: <BookOpen size={28} />,
      title: 'Course Management',
      desc: 'Create, update and organize the full course catalogue across programs and semesters.',
    },
    {
      icon: <ClipboardList size={28} />,
      title: 'Course Allocation',
      desc: 'Intelligently assign courses to faculty based on expertise, workload and availability.',
    },
    {
      icon: <Calendar size={28} />,
      title: 'Timetable Generation',
      desc: 'Auto-generate conflict-free weekly timetables for all departments in seconds.',
    },
    {
      icon: <FileText size={28} />,
      title: 'Exam Datesheets',
      desc: 'Plan and publish exam schedules with automatic conflict detection.',
    },
    {
      icon: <GraduationCap size={28} />,
      title: 'Results & CGPA',
      desc: 'Enter marks, compute grades, and let students track their academic progress in real time.',
    },
    {
      icon: <Users size={28} />,
      title: 'User Management',
      desc: 'Manage students, teachers and admins with role-based access and approval workflows.',
    },
    {
      icon: <School size={28} />,
      title: 'Classroom Management',
      desc: 'Track classrooms, capacities and availability to avoid double-booking.',
    },
    {
      icon: <BarChart2 size={28} />,
      title: 'Analytics & Statistics',
      desc: 'Get a real-time overview of allocations, registrations and departmental activity.',
    },
  ];

  const roles = [
    {
      role: 'Admin',
      color: '#0B3C5D',
      lightColor: '#e8f0f7',
      points: [
        'Manage all users & approvals',
        'Allocate courses to teachers',
        'Generate timetables & exam sheets',
        'Enter marks and view analytics',
      ],
    },
    {
      role: 'Teacher',
      color: '#0d6e4f',
      lightColor: '#e6f4ef',
      points: [
        'View personal teaching timetable',
        'Access assigned course details',
        'View exam datesheet',
        'Request course overloads',
      ],
    },
    {
      role: 'Student',
      color: '#5b21b6',
      lightColor: '#f0ecfc',
      points: [
        'Register for semester courses',
        'View personal timetable',
        'Check exam schedule',
        'Track marks & CGPA',
      ],
    },
  ];

  return (
    <div className="landing">
      {/* ── Navbar ── */}
      <header className={`landing-nav ${scrolled ? 'landing-nav--scrolled' : ''}`}>
        <div className="landing-nav__inner">
          <ScheduliXLogo to="/" theme="onDark" size="compact" className="landing-nav__logo" />
          <div className="landing-nav__actions">
            <button className="landing-btn landing-btn--ghost" onClick={() => navigate('/login')}>
              Sign In
            </button>
            <button className="landing-btn landing-btn--primary" onClick={() => navigate('/signup')}>
              Get Started
            </button>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="landing-hero">
        <div className="landing-hero__bg" />
        <div className="landing-hero__content">
          <span className="landing-hero__badge">ScheduliX · Academic scheduling</span>
          <h1 className="landing-hero__title">
            Smarter Scheduling.<br />Seamless Allocation.
          </h1>
          <p className="landing-hero__subtitle">
            One platform for admins, teachers and students to manage courses, timetables,
            exams and results — without the chaos.
          </p>
          <div className="landing-hero__ctas">
            <button className="landing-btn landing-btn--hero-primary" onClick={() => navigate('/signup')}>
              Get Started <ArrowRight size={18} />
            </button>
            <button className="landing-btn landing-btn--hero-ghost" onClick={() => navigate('/login')}>
              Sign In
            </button>
          </div>
        </div>
        <a href="#features" className="landing-hero__scroll">
          <ChevronDown size={22} />
        </a>
      </section>

      {/* ── Features ── */}
      <section className="landing-section" id="features">
        <div className="landing-section__inner">
          <p className="landing-section__eyebrow">What's inside</p>
          <h2 className="landing-section__title">Everything your institution needs</h2>
          <p className="landing-section__sub">
            From course creation to final results — every workflow in one place.
          </p>
          <div className="landing-features-grid">
            {features.map((f) => (
              <div className="landing-feature-card" key={f.title}>
                <div className="landing-feature-card__icon">{f.icon}</div>
                <h3 className="landing-feature-card__title">{f.title}</h3>
                <p className="landing-feature-card__desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Roles ── */}
      <section className="landing-section landing-section--alt" id="roles">
        <div className="landing-section__inner">
          <p className="landing-section__eyebrow">Role-based access</p>
          <h2 className="landing-section__title">Built for everyone on campus</h2>
          <p className="landing-section__sub">
            Each user gets a tailored experience with exactly the tools they need.
          </p>
          <div className="landing-roles-grid">
            {roles.map((r) => (
              <div
                className="landing-role-card"
                key={r.role}
                style={{ '--role-color': r.color, '--role-light': r.lightColor }}
              >
                <div className="landing-role-card__header">
                  <span className="landing-role-card__tag">{r.role}</span>
                </div>
                <ul className="landing-role-card__list">
                  {r.points.map((p) => (
                    <li key={p}>
                      <CheckCircle size={15} />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="landing-cta">
        <div className="landing-cta__inner">
          <h2>Ready to get started?</h2>
          <p>Join your institution today and simplify academic administration.</p>
          <div className="landing-hero__ctas">
            <button className="landing-btn landing-btn--hero-primary" onClick={() => navigate('/signup')}>
              Create an Account <ArrowRight size={18} />
            </button>
            <button className="landing-btn landing-btn--hero-ghost" onClick={() => navigate('/login')}>
              Sign In
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="landing-footer">
        <div className="landing-footer__inner">
          <ScheduliXLogo to="/" theme="onDark" size="compact" className="landing-nav__logo" />
          <span className="landing-footer__copy">
            © {new Date().getFullYear()} ScheduliX. All rights reserved.
          </span>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
