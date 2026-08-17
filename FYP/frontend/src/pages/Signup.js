import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ScheduliXLogo from '../components/ScheduliXLogo';
import { SEMESTER_OPTIONS } from '../constants';
import './Auth.css';

const DEGREE_LEVEL_OPTIONS = [
  { value: 'BS', label: 'BS (Bachelor of Science)' },
  { value: 'Master', label: 'Master' },
  { value: 'MPhil', label: 'MPhil' }
];

const Signup = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    semester: '',
    program: '',
    degreeLevel: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, feedback: [] });
  const [passwordMatch, setPasswordMatch] = useState(true);

  // Password strength checker
  const checkPasswordStrength = (password) => {
    const feedback = [];
    let score = 0;

    if (password.length >= 8) score += 1;
    else feedback.push('At least 8 characters');

    if (/[a-z]/.test(password)) score += 1;
    else feedback.push('One lowercase letter');

    if (/[A-Z]/.test(password)) score += 1;
    else feedback.push('One uppercase letter');

    if (/[0-9]/.test(password)) score += 1;
    else feedback.push('One number');

    if (/[^a-zA-Z0-9]/.test(password)) score += 1;
    else feedback.push('One special character (!@#$%^&*)');

    return { score, feedback };
  };
  
  const { register, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    setError('');
    setSuccess(''); // Clear success message when user starts typing
    
    // Check password strength in real-time
    if (name === 'password') {
      setPasswordStrength(checkPasswordStrength(value));
      // Check if passwords match when password changes
      if (formData.confirmPassword) {
        setPasswordMatch(value === formData.confirmPassword);
      }
    }
    
    // Check if passwords match when confirm password changes
    if (name === 'confirmPassword') {
      setPasswordMatch(value === formData.password);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    // Validate password match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match. Please try again.');
      setPasswordMatch(false);
      return;
    }
    
    // Validate password strength before submitting
    if (passwordStrength.score < 3) {
      setError('Password is too weak. Please use a stronger password with at least 8 characters, including uppercase, lowercase, number, and special character.');
      return;
    }

    setLoading(true);

    const userData = {
      email: formData.email,
      password: formData.password,
      name: formData.name,
      ...(formData.semester && { semester: parseInt(formData.semester) }),
      ...(formData.program && { program: formData.program }),
      ...(formData.degreeLevel && { degreeLevel: formData.degreeLevel })
    };

    const result = await register(userData);
    
    if (result.success) {
      setSuccess('Account created successfully! Redirecting to dashboard...');
      setLoading(false);
      // Wait 2 seconds to show success message before redirecting
      setTimeout(() => {
        // All roles use the same /dashboard route, but Dashboard component shows role-specific content
        navigate('/dashboard');
      }, 2000);
    } else {
      setError(result.message);
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card signup-card">
        <div className="auth-brand">
          <ScheduliXLogo theme="onLight" size="default" />
        </div>
        <h2>Create Account</h2>
        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="signup-grid">
          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="Enter your full name"
            />
          </div>
          
          <div className="form-group signup-full">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="Enter your email address"
            />
          </div>
          
          <div className="form-group signup-half">
            <label htmlFor="password">Password</label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                minLength="8"
                autoComplete="new-password"
                placeholder="Create a strong password"
                data-1p-ignore
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                )}
              </button>
            </div>
            {formData.password && (
              <div className="password-strength-indicator">
                <div className="password-strength-bar">
                  <div 
                    className={`strength-fill strength-${passwordStrength.score}`}
                    style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                  ></div>
                </div>
                <div className="password-requirements">
                  <small>Password must contain:</small>
                  <ul>
                    <li className={passwordStrength.score >= 1 ? 'met' : ''}>
                      At least 8 characters
                    </li>
                    <li className={/[a-z]/.test(formData.password) ? 'met' : ''}>
                      One lowercase letter
                    </li>
                    <li className={/[A-Z]/.test(formData.password) ? 'met' : ''}>
                      One uppercase letter
                    </li>
                    <li className={/[0-9]/.test(formData.password) ? 'met' : ''}>
                      One number
                    </li>
                    <li className={/[^a-zA-Z0-9]/.test(formData.password) ? 'met' : ''}>
                      One special character (!@#$%^&*)
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </div>
          
          <div className="form-group signup-half">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <div className="password-input-wrapper">
              <input
                type={showConfirmPassword ? "text" : "password"}
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                autoComplete="new-password"
                placeholder="Re-enter your password"
                data-1p-ignore
                className={!passwordMatch && formData.confirmPassword ? 'input-error' : ''}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                )}
              </button>
            </div>
            {!passwordMatch && formData.confirmPassword && (
              <small className="error-message">Passwords do not match</small>
            )}
            {passwordMatch && formData.confirmPassword && formData.password === formData.confirmPassword && (
              <small className="success-message">✓ Passwords match</small>
            )}
          </div>
          
          <div className="form-group signup-half">
            <label htmlFor="degreeLevel">Degree Level <small>(students only)</small></label>
            <div className="auth-select-wrapper">
              <select
                id="degreeLevel"
                name="degreeLevel"
                className={`auth-select ${!formData.degreeLevel ? 'auth-select--placeholder' : ''}`}
                value={formData.degreeLevel}
                onChange={handleChange}
              >
                <option value="">Select degree level</option>
                {DEGREE_LEVEL_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group signup-half">
            <label htmlFor="semester">Semester <small>(students only)</small></label>
            <div className="auth-select-wrapper">
              <select
                id="semester"
                name="semester"
                className={`auth-select ${!formData.semester ? 'auth-select--placeholder' : ''}`}
                value={formData.semester}
                onChange={handleChange}
              >
                <option value="">Select semester</option>
                {SEMESTER_OPTIONS.map((sem) => (
                  <option key={sem} value={sem}>
                    Semester {sem}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group signup-full">
            <label htmlFor="program">Program <small>(students only)</small></label>
            <input
              type="text"
              id="program"
              name="program"
              value={formData.program}
              onChange={handleChange}
              placeholder="Enter program name if you are a student"
            />
          </div>

          </div>{/* end signup-grid */}

          <div className="alert alert-info signup-note">
            <strong>Note:</strong> You must be pre-registered by an administrator to sign up. 
            Your role will be automatically assigned based on your registration.
          </div>
          
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Signing up...' : 'Sign Up'}
          </button>
        </form>
        
        <p className="auth-link">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;









