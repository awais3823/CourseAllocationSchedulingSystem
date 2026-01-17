import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

const Signup = () => {
  const [formData, setFormData] = useState({
    registrationNo: '',
    email: '',
    password: '',
    name: '',
    semester: '',
    program: '',
    degreeLevel: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, feedback: [] });

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
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    // Validate password strength before submitting
    if (passwordStrength.score < 3) {
      setError('Password is too weak. Please use a stronger password with at least 8 characters, including uppercase, lowercase, number, and special character.');
      return;
    }

    setLoading(true);

    const userData = {
      registrationNo: formData.registrationNo,
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
      <div className="auth-card">
        <h2>Sign Up</h2>
        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Registration Number</label>
            <input
              type="text"
              name="registrationNo"
              value={formData.registrationNo}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="form-group">
            <label>Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="form-group">
            <label>Password</label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                minLength="8"
                autoComplete="new-password"
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
          
          <div className="form-group">
            <label>Semester <small>(Required if you are a student)</small></label>
            <input
              type="number"
              name="semester"
              value={formData.semester}
              onChange={handleChange}
              min="1"
              max="8"
              placeholder="Enter semester (1-8) if you are a student"
            />
          </div>
          
          <div className="form-group">
            <label>Program <small>(Required if you are a student)</small></label>
            <input
              type="text"
              name="program"
              value={formData.program}
              onChange={handleChange}
              placeholder="Enter program name if you are a student"
            />
          </div>

          <div className="form-group">
            <label>Degree Level <small>(Required if you are a student)</small></label>
            <select
              name="degreeLevel"
              value={formData.degreeLevel}
              onChange={handleChange}
            >
              <option value="">Select degree level</option>
              <option value="BS">BS (Bachelor of Science)</option>
              <option value="Master">Master</option>
              <option value="MPhil">MPhil</option>
            </select>
          </div>

          <div className="alert alert-info" style={{ marginBottom: '20px', fontSize: '13px' }}>
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









